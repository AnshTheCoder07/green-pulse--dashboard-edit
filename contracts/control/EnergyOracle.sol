// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
EnergyOracle.sol
- Accepts signed smart meter readings and burns EnTo per kWh consumed.
- Tracks per-department monthly consumption vs. purchased EnergyPacks.
- At month end, allows claiming savings and mints EnTo rewards at 120% of purchase rate.
- Maintains credit scores and triggers loan liquidations if collateral ratio < 110%.
- Uses imports: EnergyToken, EnergyAuction, BondingCurveLib, EnergyLoan (interfaces).
- No inline copies of other contracts; relies on their public interfaces.
*/

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {EnergyToken} from "../EnergyToken.sol";
import {BondingCurveLib} from "../lib/BondingCurveLib.sol";
import {EnergyAuction} from "../market/EnergyAuction.sol";

// Minimal interface for loan module used here
interface IEnergyLoan {
    function liquidate(address borrower) external;
    function getLoan(address borrower) external view returns (
        uint256 principal,
        uint256 collateral,
        uint256 rateBps,
        bool active
    );
}

// Minimal interface for trade module (optional hooks if needed later)
interface IEnergyTrade {
    // reserved for future oracle hooks if you choose
}

contract EnergyOracle is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    // Roles
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE"); // feeder(s) pushing signed meter data
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    // External dependencies
    EnergyToken public immutable token;
    EnergyAuction public immutable auction;
    IEnergyLoan public loan;            // settable after deployment
    IEnergyTrade public trade;          // optional, can be zero

    // Economics parameters
    // Burn rate in EnTo per kWh, 18 decimals. Default: 0.08e18 (0.08 EnTo/kWh)
    uint256 public burnRate18 = 8e16;
    // Savings reward multiplier: 120% = 12000 basis points
    uint256 public savingsRewardBps = 12_000; // 1.2x
    // Liquidation threshold (collateral/principal < 110% triggers liquidation)
    uint256 public liquidationBps = 11_000;

    // Genesis/circulating reference used for bonding curve previews if auction data is missing
    uint256 public immutable genesisSupply;

    // Meter signer management
    // Authorized signers (smart meters or gateway) allowed to sign readings
    mapping(address => bool) public isMeterSigner;

    // Replay protection for signed meter payloads
    mapping(bytes32 => bool) public usedMeterNonces;

    // Credit scores 0–100
    mapping(address => uint256) public creditScore;

    // Monthly accounting
    struct MonthUsage {
        uint256 kWhPurchased;  // from auction (cached)
        uint256 kWhConsumed;   // accumulated via recordUsage
        uint256 unitPrice18;   // weighted purchase unit price (kWh/EnTo, 1e18)
        bool    initialized;   // set once read from auction or first update
        bool    settled;       // true after month-end settlement
    }
    // month => dept => usage
    mapping(uint256 => mapping(address => MonthUsage)) public usage;

    // Events
    event MeterSignerUpdated(address indexed signer, bool allowed, address indexed by);
    event BurnRateUpdated(uint256 rate18, address indexed by);
    event SavingsRewardUpdated(uint256 bps, address indexed by);
    event LiquidationThresholdUpdated(uint256 bps, address indexed by);
    event LoanModuleUpdated(address indexed loan, address indexed by);
    event TradeModuleUpdated(address indexed trade, address indexed by);

    event UsageRecorded(
        uint256 indexed month,
        address indexed dept,
        uint256 kWh,
        uint256 burnedEnTo,
        bytes32 payloadHash,
        address indexed signer
    );

    event MonthInitialized(
        uint256 indexed month,
        address indexed dept,
        uint256 kWhPurchased,
        uint256 unitPrice18
    );

    event SavingsClaimed(
        uint256 indexed month,
        address indexed dept,
        uint256 savedKWh,
        uint256 rewardEnTo,
        uint256 rewardPrice18
    );

    event CreditScoreUpdated(address indexed dept, uint256 oldScore, uint256 newScore, int256 delta, string reason);

    event AdminPaused(address indexed by);
    event AdminUnpaused(address indexed by);

    constructor(
        address token_,
        address auction_,
        uint256 genesisSupply_,
        address admin_
    ) {
        require(token_ != address(0), "token zero");
        require(auction_ != address(0), "auction zero");
        require(admin_ != address(0), "admin zero");
        require(genesisSupply_ > 0, "genesis=0");

        token = EnergyToken(token_);
        auction = EnergyAuction(auction_);
        genesisSupply = genesisSupply_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
    }

    // -------------------------
    // Admin configuration
    // -------------------------

    function setLoanModule(address loan_) external onlyRole(ADMIN_ROLE) {
        loan = IEnergyLoan(loan_);
        emit LoanModuleUpdated(loan_, msg.sender);
    }

    function setTradeModule(address trade_) external onlyRole(ADMIN_ROLE) {
        trade = IEnergyTrade(trade_);
        emit TradeModuleUpdated(trade_, msg.sender);
    }

    function setBurnRate(uint256 rate18) external onlyRole(ADMIN_ROLE) {
        require(rate18 > 0 && rate18 < 1e18, "rate bounds");
        burnRate18 = rate18;
        emit BurnRateUpdated(rate18, msg.sender);
    }

    function setSavingsRewardBps(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps >= 10_000 && bps <= 20_000, "reward bounds"); // 1.0x..2.0x
        savingsRewardBps = bps;
        emit SavingsRewardUpdated(bps, msg.sender);
    }

    function setLiquidationThreshold(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps >= 10_000 && bps <= 20_000, "liq bounds"); // 100%..200%
        liquidationBps = bps;
        emit LiquidationThresholdUpdated(bps, msg.sender);
    }

    function setMeterSigner(address signer, bool allowed) external onlyRole(ADMIN_ROLE) {
        require(signer != address(0), "signer zero");
        isMeterSigner[signer] = allowed;
        emit MeterSignerUpdated(signer, allowed, msg.sender);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit AdminPaused(msg.sender);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit AdminUnpaused(msg.sender);
    }

    // -------------------------
    // Core Oracle functions
    // -------------------------

    // Meter payload structure (off-chain)
    // dept: department wallet address
    // month: uint256 month id (e.g., yyyymm)
    // kWh: amount consumed to add
    // nonce: unique bytes32 to prevent replay
    // signed by an authorized meter signer
    function recordUsageSigned(
        address dept,
        uint256 month,
        uint256 kWh,
        bytes32 nonce,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyRole(ORACLE_ROLE) {
        require(dept != address(0), "dept zero");
        require(kWh > 0, "kWh=0");
        require(!usedMeterNonces[nonce], "nonce used");

        // Verify signer
        bytes32 payloadHash = keccak256(abi.encodePacked(address(this), dept, month, kWh, nonce));
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(payloadHash), signature);
        require(isMeterSigner[signer], "bad signer");

        usedMeterNonces[nonce] = true;

        // Ensure month state initialized with purchase info
        _ensureMonthInit(dept, month);

        // Accumulate consumption and burn EnTo
        uint256 burnAmt = _burnAmountFor(kWh);
        // Oracle is granted BURNER_ROLE on token in deployment scripts
        token.burnFrom(dept, burnAmt);

        usage[month][dept].kWhConsumed += kWh;

        emit UsageRecorded(month, dept, kWh, burnAmt, payloadHash, signer);

        // Optional loan health check after each burn
        _checkAndLiquidateIfNeeded(dept);
    }

    // Month-end settlement: mint rewards for saved energy
    // savedKWh = max( purchased - consumed, 0 )
    // Reward EnTo = savedKWh / unitPrice * savingsRewardBps/10_000
    function claimSavings(uint256 month) external nonReentrant whenNotPaused {
        address dept = msg.sender;

        _ensureMonthInit(dept, month);

        MonthUsage storage m = usage[month][dept];
        require(!m.settled, "already settled");

        uint256 purchased = m.kWhPurchased;
        uint256 consumed  = m.kWhConsumed;
        if (consumed >= purchased) {
            // No savings
            m.settled = true;
            emit SavingsClaimed(month, dept, 0, 0, m.unitPrice18);
            return;
        }

        uint256 savedKWh = purchased - consumed;

        // Reward calculation
        // unitPrice18 is kWh per EnTo; EnTo = kWh * 1e18 / unitPrice18
        // Apply reward multiplier (e.g., 1.2x)
        uint256 baseEnTo = (savedKWh * 1e18) / m.unitPrice18;
        uint256 rewardEnTo = (baseEnTo * savingsRewardBps) / 10_000;

        // Oracle must have MINTER_ROLE on token
        token.mint(dept, rewardEnTo);

        m.settled = true;
        emit SavingsClaimed(month, dept, savedKWh, rewardEnTo, m.unitPrice18);

        // Credit score bonus: +1 for saving >=5% of purchased
        if (purchased > 0 && savedKWh * 100 >= purchased * 5) {
            _bumpCreditScore(dept, 1, "month_savings_bonus");
        }
    }

    // -------------------------
    // Views & helpers
    // -------------------------

    function previewBurnAmount(uint256 kWh) external view returns (uint256) {
        return _burnAmountFor(kWh);
    }

    function getMonthUsage(uint256 month, address dept) external view returns (MonthUsage memory) {
        return usage[month][dept];
    }

    // Initialize MonthUsage with auction data if not already done.
    function _ensureMonthInit(address dept, uint256 month) internal {
        MonthUsage storage m = usage[month][dept];
        if (m.initialized) return;

        // Read pack info from auction
        EnergyAuction.Pack memory p = auction.getPack(month, dept);
        if (!p.exists || p.kWhPurchased == 0) {
            // No purchase recorded; still initialize with neutral values.
            // Fallback unit price from current bonding curve to avoid div-by-zero later.
            uint256 fallbackPrice18 = BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply);
            m.kWhPurchased = 0;
            m.kWhConsumed  = 0;
            m.unitPrice18  = fallbackPrice18 == 0 ? 10e18 : fallbackPrice18; // safety default 10 kWh/EnTo
            m.initialized  = true;
            emit MonthInitialized(month, dept, 0, m.unitPrice18);
            return;
        }

        // Initialize with auction purchase data
        m.kWhPurchased = p.kWhPurchased;
        m.kWhConsumed  = 0;
        m.unitPrice18  = p.unitPrice18 == 0 ? BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply) : p.unitPrice18;
        m.initialized  = true;

        emit MonthInitialized(month, dept, m.kWhPurchased, m.unitPrice18);
    }

    function _burnAmountFor(uint256 kWh) internal view returns (uint256) {
        // EnTo burn = kWh * burnRate18 / 1e18
        // Multiply first to keep precision
        return (kWh * burnRate18);
    }

    // -------------------------
    // Credit score utilities
    // -------------------------

    function setCreditScore(address dept, uint256 score) external onlyRole(ADMIN_ROLE) {
        require(dept != address(0), "dept zero");
        require(score <= 100, "score>100");
        uint256 old = creditScore[dept];
        creditScore[dept] = score;
        emit CreditScoreUpdated(dept, old, score, int256(score) - int256(old), "admin_set");
    }

    function incrementCredit(address dept, uint256 points, string memory reason) external onlyRole(ADMIN_ROLE) {
        _bumpCreditScore(dept, int256(points), reason);
    }

    function decrementCredit(address dept, uint256 points, string memory reason) external onlyRole(ADMIN_ROLE) {
        _bumpCreditScore(dept, -int256(points), reason);
    }

    function _bumpCreditScore(address dept, int256 delta, string memory reason) internal {
        require(dept != address(0), "dept zero");
        int256 cur = int256(creditScore[dept]);
        int256 nxt = cur + delta;
        if (nxt < 0) nxt = 0;
        if (nxt > 100) nxt = 100;
        creditScore[dept] = uint256(nxt);
        emit CreditScoreUpdated(dept, uint256(cur), uint256(nxt), delta, reason);
    }

    // -------------------------
    // Loan liquidation checks
    // -------------------------

    // For simplicity, we assume loan module keeps principal/collateral in EnTo terms.
    // If active and ratio < liquidationBps, call liquidate().
    function _checkAndLiquidateIfNeeded(address borrower) internal {
        if (address(loan) == address(0)) return;

        (uint256 principal, uint256 collateral,, bool active) = loan.getLoan(borrower);
        if (!active || principal == 0) return;

        // ratio = collateral/principal in bps
        // to avoid division by zero, checked principal>0 above
        uint256 ratioBps = (collateral * 10_000) / principal;
        if (ratioBps < liquidationBps) {
            // trigger liquidation
            loan.liquidate(borrower);
            // penalty on credit score
            _bumpCreditScore(borrower, -int256(5), "loan_liquidation");
        }
    }
}
