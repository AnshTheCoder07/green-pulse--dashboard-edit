// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
EnergyLoan.sol
- Collateralized lending in EnTo (EnergyToken)
- Dynamic interest rate derived from borrower credit score
- Per-second interest accrual with linear APR
- Collateral management: deposit/withdraw guarded by health checks
- Liquidation if collateral/principal ratio < LIQUIDATION_BPS
- Roles for admin, risk manager, and oracle updater
- Emits rich events for off-chain analytics/dashboards
*/

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// EnergyToken interface: mint/burn are not used here (loans are funded by treasury or AMM).
interface IEnergyToken is IERC20 {}

// Minimal Oracle interface: used to read credit score and optionally nudge updates.
interface IEnergyOracle {
    function creditScore(address dept) external view returns (uint256);
    // Optionally the oracle may expose score bump methods; we keep read-only here for decoupling.
}

// Optional Trade/AMM interface if you want to auto-sell seized collateral (left as future hook).
interface IEnergyTrade {
    // function sellEnToForINROrEnergy(uint256 amt, uint256 minOut) external returns (uint256 out);
}

// Optional Governance/Staking hooks for future risk parameter votes (not required here).
interface IGovStaking {
    // function hasQuorum(bytes32 paramKey, uint256 newVal) external view returns (bool);
}

contract EnergyLoan is AccessControl, ReentrancyGuard, Pausable {
    // -------------------------
    // Roles
    // -------------------------
    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");        // config/treasury
    bytes32 public constant RISK_ROLE        = keccak256("RISK_ROLE");         // risk params
    bytes32 public constant ORACLE_UPDATER   = keccak256("ORACLE_UPDATER");    // set oracle address

    // -------------------------
    // External contracts
    // -------------------------
    IEnergyToken public immutable token;   // EnTo
    IEnergyOracle public oracle;           // credit score source (settable)
    IEnergyTrade public trade;             // optional for auto-liquidation routing
    IGovStaking public gov;                // optional governance source

    address public treasury;               // address that provides loan liquidity and collects interest

    // -------------------------
    // Risk parameters (all in basis points where applicable)
    // -------------------------
    uint256 public MIN_CREDIT_SCORE = 40;         // below this, borrowing is disallowed
    uint256 public MIN_COLLATERAL_BPS = 5_000;    // 50% of principal (in EnTo terms)
    uint256 public LIQUIDATION_BPS   = 11_000;    // 110% collateral/principal to be safe
    uint256 public BASE_RATE_BPS     = 200;       // 2% APR baseline floor
    uint256 public MAX_RATE_BPS      = 500;       // 5% APR cap (for worst credit)

    // Interest accrual timing
    uint256 public constant BPS_DENOM = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Borrow limits
    uint256 public MAX_LOAN_PER_BORROWER = 200_000e18; // adjust as needed
    uint256 public MAX_TOTAL_EXPOSURE    = 2_000_000e18;

    // Exposure tracking
    uint256 public totalPrincipal; // total outstanding (excl. interest)

    // -------------------------
    // Loan state
    // -------------------------
    struct Loan {
        uint256 principal;      // borrowed EnTo (without accrued interest)
        uint256 collateral;     // posted EnTo collateral
        uint256 rateBps;        // current APR in basis points
        uint256 lastAccrualTs;  // last time interest accrual was applied
        bool    active;
    }

    mapping(address => Loan) public loans;

    // -------------------------
    // Events
    // -------------------------
    event OracleUpdated(address indexed oracle, address indexed by);
    event TradeUpdated(address indexed trade, address indexed by);
    event TreasuryUpdated(address indexed treasury, address indexed by);
    event RiskParamUpdated(bytes32 indexed key, uint256 value, address indexed by);

    event LoanRequested(address indexed borrower, uint256 amount, uint256 rateBps);
    event LoanFunded(address indexed borrower, uint256 amount, address indexed treasury);
    event CollateralDeposited(address indexed borrower, uint256 amount);
    event CollateralWithdrawn(address indexed borrower, uint256 amount);
    event InterestAccrued(address indexed borrower, uint256 interest, uint256 newPrincipal);
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 remainingPrincipal);
    event Liquidated(address indexed borrower, uint256 seizedCollateral, uint256 remainingDebt);
    event LoanClosed(address indexed borrower);

    // -------------------------
    // Constructor
    // -------------------------
    constructor(address token_, address admin_, address treasury_) {
        require(token_ != address(0), "token zero");
        require(admin_ != address(0), "admin zero");
        require(treasury_ != address(0), "treasury zero");

        token = IEnergyToken(token_);
        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(RISK_ROLE, admin_);
        _grantRole(ORACLE_UPDATER, admin_);
    }

    // -------------------------
    // Admin/Risk setters
    // -------------------------
    function setOracle(address oracle_) external onlyRole(ORACLE_UPDATER) {
        oracle = IEnergyOracle(oracle_);
        emit OracleUpdated(oracle_, msg.sender);
    }

    function setTrade(address trade_) external onlyRole(ADMIN_ROLE) {
        trade = IEnergyTrade(trade_);
        emit TradeUpdated(trade_, msg.sender);
    }

    function setTreasury(address treasury_) external onlyRole(ADMIN_ROLE) {
        require(treasury_ != address(0), "treasury zero");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_, msg.sender);
    }

    function setRiskParam(bytes32 key, uint256 val) external onlyRole(RISK_ROLE) {
        if (key == keccak256("MIN_CREDIT_SCORE")) {
            require(val <= 100, "score>100");
            MIN_CREDIT_SCORE = val;
        } else if (key == keccak256("MIN_COLLATERAL_BPS")) {
            require(val <= 100_000, "collateral too high"); // sanity
            MIN_COLLATERAL_BPS = val;
        } else if (key == keccak256("LIQUIDATION_BPS")) {
            require(val >= BPS_DENOM, "liq<threshold");
            LIQUIDATION_BPS = val;
        } else if (key == keccak256("BASE_RATE_BPS")) {
            require(val <= MAX_RATE_BPS, "base>max");
            BASE_RATE_BPS = val;
        } else if (key == keccak256("MAX_RATE_BPS")) {
            require(val >= BASE_RATE_BPS && val <= 5_000, "max out of bounds");
            MAX_RATE_BPS = val;
        } else if (key == keccak256("MAX_LOAN_PER_BORROWER")) {
            MAX_LOAN_PER_BORROWER = val;
        } else if (key == keccak256("MAX_TOTAL_EXPOSURE")) {
            MAX_TOTAL_EXPOSURE = val;
        } else {
            revert("unknown param");
        }
        emit RiskParamUpdated(key, val, msg.sender);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // -------------------------
    // Borrow logic
    // -------------------------

    // Borrow EnTo with collateral; interest rate derived from credit score.
    // Caller must approve this contract to transfer collateral EnTo beforehand.
    function requestLoan(uint256 amountEnTo, uint256 collateralEnTo)
        external
        nonReentrant
        whenNotPaused
    {
        require(address(oracle) != address(0), "oracle unset");
        require(amountEnTo > 0, "amount=0");

        // Pre-check exposure limits
        require(totalPrincipal + amountEnTo <= MAX_TOTAL_EXPOSURE, "pool exposure");
        Loan storage L = loans[msg.sender];
        require(L.principal + amountEnTo <= MAX_LOAN_PER_BORROWER, "borrower limit");

        // Credit score gate
        uint256 score = oracle.creditScore(msg.sender);
        require(score >= MIN_CREDIT_SCORE, "score too low");

        // Compute rate: linear between BASE_RATE_BPS at score=100 and MAX_RATE_BPS at score=MIN_CREDIT_SCORE
        uint256 rate = _rateFromScore(score);

        // Initialize or accrue existing loan before changing figures
        if (L.active) {
            _accrueInterest(msg.sender, L);
        } else {
            L.active = true;
            L.lastAccrualTs = block.timestamp;
        }

        // Update collateral: pull from borrower into contract
        if (collateralEnTo > 0) {
            require(token.transferFrom(msg.sender, address(this), collateralEnTo), "collateral transfer failed");
            L.collateral += collateralEnTo;
            emit CollateralDeposited(msg.sender, collateralEnTo);
        }

        // Update principal & rate
        L.principal += amountEnTo;
        L.rateBps = rate; // set/refresh borrower rate from latest score
        totalPrincipal += amountEnTo;

        // Collateral requirement check (principal basis)
        require(_collateralHealthy(L.principal, L.collateral, MIN_COLLATERAL_BPS), "collateral < min");

        // Fund borrower from treasury (treasury must approve this contract to transfer on its behalf, or treasury calls a fund function)
        require(token.transferFrom(treasury, msg.sender, amountEnTo), "fund transfer failed");

        emit LoanRequested(msg.sender, amountEnTo, rate);
        emit LoanFunded(msg.sender, amountEnTo, treasury);
    }

    // Repay principal + interest (partial or full). Caller must approve this contract to pull EnTo.
    function repay(uint256 repayAmount)
        external
        nonReentrant
        whenNotPaused
    {
        require(repayAmount > 0, "repay=0");
        Loan storage L = loans[msg.sender];
        require(L.active && L.principal > 0, "no loan");

        // Accrue interest first
        uint256 interest = _accrueInterest(msg.sender, L); // updates L.principal

        // Pull repayment from borrower to treasury
        require(token.transferFrom(msg.sender, treasury, repayAmount), "repay transfer failed");

        // Apply repayment
        if (repayAmount >= L.principal) {
            uint256 overpay = repayAmount - L.principal;
            totalPrincipal -= L.principal;
            L.principal = 0;

            // Close loan and release collateral
            uint256 col = L.collateral;
            L.collateral = 0;
            L.active = false;
            L.lastAccrualTs = block.timestamp;
            if (col > 0) {
                require(token.transfer(msg.sender, col), "collateral return failed");
                emit CollateralWithdrawn(msg.sender, col);
            }

            // If overpay exists, keep it in treasury; or optionally refund (not recommended).
            emit LoanRepaid(msg.sender, repayAmount - overpay, 0);
            emit LoanClosed(msg.sender);
        } else {
            // Partial repayment
            L.principal -= repayAmount;
            totalPrincipal -= repayAmount;
            emit LoanRepaid(msg.sender, repayAmount, L.principal);
        }
    }

    // Deposit more collateral at any time.
    function depositCollateral(uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "amount=0");
        Loan storage L = loans[msg.sender];
        require(L.active, "no loan");
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        L.collateral += amount;
        emit CollateralDeposited(msg.sender, amount);
    }

    // Withdraw collateral if health remains above minimum collateral and above liquidation threshold.
    function withdrawCollateral(uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        require(amount > 0, "amount=0");
        Loan storage L = loans[msg.sender];
        require(L.active, "no loan");

        // Accrue interest to get current principal first
        _accrueInterest(msg.sender, L);

        require(L.collateral >= amount, "insufficient collateral");
        // Check post-withdraw health against both minimum collateral and liquidation threshold
        uint256 newCol = L.collateral - amount;
        require(_collateralHealthy(L.principal, newCol, MIN_COLLATERAL_BPS), "violates min collateral");
        require(_collateralHealthy(L.principal, newCol, LIQUIDATION_BPS), "violates liq threshold");

        L.collateral = newCol;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit CollateralWithdrawn(msg.sender, amount);
    }

    // Liquidation path (callable by anyone)
    // If collateral/principal < LIQUIDATION_BPS, seize entire collateral to treasury and leave remaining debt on account (or zero it).
    // For hackathon simplicity: seize all collateral; reduce principal by seized amount; if insufficient, leave remainder (or zero-out to close).
    function liquidate(address borrower)
        external
        nonReentrant
        whenNotPaused
    {
        Loan storage L = loans[borrower];
        require(L.active && L.principal > 0, "no active loan");

        // Accrue interest to assess real health
        _accrueInterest(borrower, L);

        // Check threshold
        require(!_collateralHealthy(L.principal, L.collateral, LIQUIDATION_BPS), "healthy");

        uint256 seized = L.collateral;
        L.collateral = 0;

        // Apply seized collateral as repayment to reduce principal, then move seized collateral to treasury.
        if (seized >= L.principal) {
            uint256 surplus = seized - L.principal;
            totalPrincipal -= L.principal;
            L.principal = 0;

            // Close loan
            L.active = false;
            L.lastAccrualTs = block.timestamp;

            // Move collateral (all seized) to treasury
            require(token.transfer(treasury, seized), "move seized failed");

            emit Liquidated(borrower, seized, 0);
            emit LoanClosed(borrower);

            // Optional: send surplus back to borrower or keep in treasury. We keep in treasury for simplicity.
        } else {
            // Partial cover
            L.principal -= seized;
            totalPrincipal -= seized;

            require(token.transfer(treasury, seized), "move seized failed");

            emit Liquidated(borrower, seized, L.principal);
            // Loan remains active with reduced principal, zero collateral; borrower must top up or repay.
        }
    }

    // -------------------------
    // Views
    // -------------------------

    // Current borrower APR based on oracle credit score.
    function previewRateBps(address borrower) external view returns (uint256) {
        if (address(oracle) == address(0)) return MAX_RATE_BPS;
        uint256 s = oracle.creditScore(borrower);
        return _rateFromScore(s);
    }

    // Preview interest accrued since last accrual
    function previewAccruedInterest(address borrower) external view returns (uint256) {
        Loan memory L = loans[borrower];
        if (!L.active || L.principal == 0) return 0;
        uint256 dt = block.timestamp - L.lastAccrualTs;
        if (dt == 0) return 0;
        // linear accrual: principal * rate * dt / year
        return (L.principal * L.rateBps * dt) / (BPS_DENOM * SECONDS_PER_YEAR);
    }

    // Health ratios
    function collateralRatioBps(address borrower) external view returns (uint256) {
        Loan memory L = loans[borrower];
        if (!L.active || L.principal == 0) return type(uint256).max;
        return (L.collateral * BPS_DENOM) / L.principal;
    }

    // -------------------------
    // Internal helpers
    // -------------------------

    function _rateFromScore(uint256 score) internal view returns (uint256) {
        // Map score ∈ [MIN_CREDIT_SCORE, 100] to rate ∈ [MAX_RATE_BPS, BASE_RATE_BPS] linearly
        if (score >= 100) return BASE_RATE_BPS;
        if (score <= MIN_CREDIT_SCORE) return MAX_RATE_BPS;

        // t from 0..1: 0 at worst score, 1 at best
        // t = (score - MIN_CREDIT_SCORE) / (100 - MIN_CREDIT_SCORE)
        uint256 num = (score - MIN_CREDIT_SCORE) * 1e18;
        uint256 den = (100 - MIN_CREDIT_SCORE);
        uint256 t = num / den; // 1e18 scale

        // rate = MAX - t*(MAX-BASE)
        uint256 diff = MAX_RATE_BPS - BASE_RATE_BPS;
        uint256 reduction = (diff * t) / 1e18;
        return MAX_RATE_BPS - reduction;
    }

    function _accrueInterest(address borrower, Loan storage L) internal returns (uint256 interest) {
        if (!L.active || L.principal == 0) {
            L.lastAccrualTs = block.timestamp;
            return 0;
        }
        uint256 dt = block.timestamp - L.lastAccrualTs;
        if (dt == 0) return 0;

        // linear interest: principal * rate * dt / (BPS_DENOM * SECONDS_PER_YEAR)
        interest = (L.principal * L.rateBps * dt) / (BPS_DENOM * SECONDS_PER_YEAR);
        if (interest > 0) {
            L.principal += interest;
            totalPrincipal += interest;
            emit InterestAccrued(borrower, interest, L.principal);
        }
        L.lastAccrualTs = block.timestamp;
    }

    function _collateralHealthy(uint256 principal, uint256 collateral, uint256 thresholdBps)
        internal
        pure
        returns (bool)
    {
        if (principal == 0) return true;
        uint256 ratio = (collateral * BPS_DENOM) / principal;
        return ratio >= thresholdBps;
    }
}
