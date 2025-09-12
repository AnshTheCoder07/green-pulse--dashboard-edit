// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
EnergyTrade.sol
- P2P surplus energy trading among departments using EnTo as the currency.
- Order book (FIFO) with partial fills and cancelations by seller.
- Constant-product AMM pool (EnTo <-> kWh) as a liquidity backstop.
- Enforces a minimum premium over the current pack price (from bonding curve) to prevent undercutting monthly auctions.
- Pausable and role-gated admin configuration.
- Emits rich events for analytics and UI.

Assumptions:
- "Energy" is represented as a virtual unit (kWh). It is not a token here; the trade produces a ledger event and the backend/Oracle will reflect the energy IOU delivery and meter usage.
- EnTo is an ERC-20 (EnergyToken) used to pay for energy.
- Current reference price (kWh per EnTo) is fetched from BondingCurveLib using total supply and genesis supply reference you pass into the constructor.
- Treasury seeds AMM liquidity and can withdraw AMM fees.

Optional integrations:
- You may have the Oracle/Auction confirm a department's entitlement to sell surplus; this contract focuses on the market plumbing.
*/

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BondingCurveLib} from "../lib/BondingCurveLib.sol";

interface IEnergyToken is IERC20 {
    function totalSupply() external view returns (uint256);
}

contract EnergyTrade is AccessControl, ReentrancyGuard, Pausable {
    // ------------------------
    // Roles
    // ------------------------
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ------------------------
    // External contracts
    // ------------------------
    IEnergyToken public immutable token; // EnTo

    // Reference for bonding curve (used to enforce minimum premium)
    uint256 public immutable genesisSupply;

    // Treasury for AMM liquidity and fee accrual
    address public treasury;

    // ------------------------
    // Config
    // ------------------------
    // Minimum premium over the current pack reference price (e.g., 10% = 1_000 bps)
    uint256 public minPremiumBps = 1_000; // 10%
    uint256 public constant BPS_DENOM = 10_000;

    // AMM fee in bps, if you want to take a fee from swaps (default 0)
    uint256 public ammFeeBps = 0; // 0% by default

    // ------------------------
    // Order book structures
    // ------------------------
    struct Order {
        address seller;
        uint256 kWhRemaining;   // how much energy remains to sell
        uint256 price18;        // kWh per EnTo (1e18). Note: buyer EnTo = kWh * 1e18 / price18
        bool    active;
    }

    Order[] public orderBook;           // simple FIFO array
    mapping(uint256 => uint256) public filledKwh; // optional stat

    // ------------------------
    // AMM pool (constant-product)
    // x = EnTo reserves (1e18 units), y = kWh reserves (1e0 units but treated as 1e18 when needed)
    // We maintain a fixed 1e18 for EnTo and treat kWh as 1e18 scale only in conversions.
    // ------------------------
    uint256 public ammEnToReserves;     // EnTo in pool
    uint256 public ammKwhReserves;      // kWh in pool
    uint256 public constant ONE = 1e18; // scale factor for EnTo math

    // ------------------------
    // Events
    // ------------------------
    event TreasuryUpdated(address indexed treasury, address indexed by);
    event MinPremiumUpdated(uint256 minPremiumBps, address indexed by);
    event AmmFeeUpdated(uint256 ammFeeBps, address indexed by);

    event OrderListed(uint256 indexed orderId, address indexed seller, uint256 kWh, uint256 price18);
    event OrderFilled(uint256 indexed orderId, address indexed buyer, uint256 kWh, uint256 enToPaid, uint256 remaining);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);

    event AmmSeeded(uint256 enToAdded, uint256 kWhAdded, address indexed by);
    event AmmSwapEnToForKwh(address indexed buyer, uint256 enToIn, uint256 kWhOut, uint256 newEnToRes, uint256 newKwhRes);
    event AmmSwapKwhForEnTo(address indexed seller, uint256 kWhIn, uint256 enToOut, uint256 newEnToRes, uint256 newKwhRes);


    // ------------------------
    // Constructor
    // ------------------------
    constructor(address token_, uint256 genesisSupply_, address admin_, address treasury_) {
        require(token_ != address(0), "token zero");
        require(admin_ != address(0), "admin zero");
        require(treasury_ != address(0), "treasury zero");
        require(genesisSupply_ > 0, "genesis=0");

        token = IEnergyToken(token_);
        genesisSupply = genesisSupply_;
        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
    }

    // ------------------------
    // Admin
    // ------------------------
    function setTreasury(address t) external onlyRole(ADMIN_ROLE) {
        require(t != address(0), "treasury zero");
        treasury = t;
        emit TreasuryUpdated(t, msg.sender);
    }

    function setMinPremiumBps(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= 50_000, "bps too high"); // 500% upper bound sanity
        minPremiumBps = bps;
        emit MinPremiumUpdated(bps, msg.sender);
    }

    function setAmmFeeBps(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= 1_000, "fee too high"); // cap at 10% for sanity
        ammFeeBps = bps;
        emit AmmFeeUpdated(bps, msg.sender);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit Unpaused(msg.sender);
    }

    // ------------------------
    // P2P Order Book
    // ------------------------

    // Seller lists surplus energy at a unit price (kWh per EnTo) that must be >= reference*(1+minPremium)
    function listSurplus(uint256 kWh, uint256 price18) external whenNotPaused returns (uint256 orderId) {
        require(kWh > 0, "kWh=0");
        require(price18 > 0, "price=0");

        // Enforce minimum premium vs current reference price
        uint256 refPrice18 = BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply);
        require(price18 >= (refPrice18 * (BPS_DENOM + minPremiumBps)) / BPS_DENOM, "below min premium");

        orderId = orderBook.length;
        orderBook.push(Order({
            seller: msg.sender,
            kWhRemaining: kWh,
            price18: price18,
            active: true
        }));

        emit OrderListed(orderId, msg.sender, kWh, price18);
    }

    // Buyer fills from an order (partial or full). Buyer must have approved EnTo beforehand.
    // enToMax lets buyer cap how much EnTo they are willing to spend.
    function buyFromOrder(uint256 orderId, uint256 kWhWanted, uint256 enToMax)
        external
        nonReentrant
        whenNotPaused
    {
        require(orderId < orderBook.length, "bad id");
        Order storage o = orderBook[orderId];
        require(o.active, "inactive");
        require(kWhWanted > 0, "kWh=0");

        uint256 k = kWhWanted > o.kWhRemaining ? o.kWhRemaining : kWhWanted;

        // EnTo needed = kWh * 1e18 / price18
        uint256 enToNeeded = (k * ONE) / o.price18;
        require(enToNeeded > 0, "enTo=0");
        require(enToNeeded <= enToMax, "slippage");

        // Pull EnTo from buyer -> pay seller
        require(token.transferFrom(msg.sender, o.seller, enToNeeded), "payment failed");

        o.kWhRemaining -= k;
        filledKwh[orderId] += k;
        if (o.kWhRemaining == 0) {
            o.active = false;
        }

        emit OrderFilled(orderId, msg.sender, k, enToNeeded, o.kWhRemaining);
    }

    // Seller cancels remaining amount on their order
    function cancelOrder(uint256 orderId) external whenNotPaused {
        require(orderId < orderBook.length, "bad id");
        Order storage o = orderBook[orderId];
        require(o.active, "inactive");
        require(o.seller == msg.sender, "not seller");
        o.active = false;
        emit OrderCancelled(orderId, msg.sender);
    }

    // ------------------------
    // AMM Backstop (constant-product x*y=k)
    // Pricing is implicit; buyer passes minKwhOut to protect against slippage.
    // ------------------------

    // Seed AMM reserves (treasury provides both sides)
    // Treasury must approve EnTo beforehand. kWh are virtual units; you inject them by calling this function.
    function seedAmm(uint256 enToAmount, uint256 kWhAmount) external onlyRole(ADMIN_ROLE) {
        if (enToAmount > 0) {
            require(token.transferFrom(treasury, address(this), enToAmount), "seed EnTo failed");
            ammEnToReserves += enToAmount;
        }
        if (kWhAmount > 0) {
            ammKwhReserves += kWhAmount;
        }
        require(ammEnToReserves > 0 && ammKwhReserves > 0, "empty pool");
        emit AmmSeeded(enToAmount, kWhAmount, msg.sender);
    }

    // Buyer swaps EnTo for kWh from AMM
    // Input: enToIn; Output: kWhOut with slippage protection (minKwhOut).
    function ammSwapEnToForKwh(uint256 enToIn, uint256 minKwhOut)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 kWhOut)
    {
        require(enToIn > 0, "enTo=0");
        require(ammEnToReserves > 0 && ammKwhReserves > 0, "pool empty");

        // Take fee if enabled
        uint256 enToInAfterFee = enToIn;
        if (ammFeeBps > 0) {
            uint256 fee = (enToIn * ammFeeBps) / BPS_DENOM;
            enToInAfterFee = enToIn - fee;
            // Directly accrue fee to treasury reserves
            require(token.transferFrom(msg.sender, address(this), enToIn), "pull failed");
            // Move fee portion to treasury wallet
            require(token.transfer(treasury, fee), "fee xfer failed");
        } else {
            require(token.transferFrom(msg.sender, address(this), enToIn), "pull failed");
        }

        // Constant product: (E + enToInAfterFee) * (K - kOut) = E*K
        // Solve for kOut: kOut = (K * enToInAfterFee) / (E + enToInAfterFee)
        uint256 E = ammEnToReserves;
        uint256 K = ammKwhReserves;
        kWhOut = (K * enToInAfterFee) / (E + enToInAfterFee);
        require(kWhOut > 0 && kWhOut <= K, "bad out");
        require(kWhOut >= minKwhOut, "slippage");

        // Update reserves
        ammEnToReserves = E + enToInAfterFee;
        ammKwhReserves = K - kWhOut;

        emit AmmSwapEnToForKwh(msg.sender, enToIn, kWhOut, ammEnToReserves, ammKwhReserves);
    }

    // Seller swaps kWh for EnTo from AMM
    // Input: kWhIn; Output: enToOut with slippage protection (minEnToOut).
    function ammSwapKwhForEnTo(uint256 kWhIn, uint256 minEnToOut)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 enToOut)
    {
        require(kWhIn > 0, "kWh=0");
        require(ammEnToReserves > 0 && ammKwhReserves > 0, "pool empty");

        // Constant product: (E - eOut) * (K + kIn) = E*K
        // Solve for eOut: eOut = (E * kIn) / (K + kIn)
        uint256 E = ammEnToReserves;
        uint256 K = ammKwhReserves;
        enToOut = (E * kWhIn) / (K + kWhIn);

        // Apply fee on output if enabled
        if (ammFeeBps > 0) {
            uint256 fee = (enToOut * ammFeeBps) / BPS_DENOM;
            enToOut = enToOut - fee;
            // Fee portion stays in the pool, then transfer to treasury for accounting
            require(enToOut > 0, "fee wipes out");
            // Transfer from pool to seller
            require(token.transfer(msg.sender, enToOut), "xfer failed");
            // Transfer fee to treasury
            require(token.transfer(treasury, fee), "fee xfer failed");
        } else {
            require(enToOut >= minEnToOut, "slippage");
            require(token.transfer(msg.sender, enToOut), "xfer failed");
        }

        // Update reserves
        ammEnToReserves = E - ((ammFeeBps > 0) ? (enToOut + (enToOut * ammFeeBps) / (BPS_DENOM - ammFeeBps)) : enToOut);
        // The above reserve update is complex under fee; simpler approach:
        // Recompute reserves explicitly:
        // Without fee: E' = E - enToOut ; K' = K + kWhIn
        // With fee taken out of enToOut and sent to treasury, pool outflow is still total eOut (pre-fee).
        // Let's recompute cleanly:

        // Recompute with clean math:
        // First derive the "pre-fee" enToOut for reserves accounting
        uint256 preFeeEnToOut = (E * kWhIn) / (K + kWhIn);
        // Reserves: EnTo decreases by preFeeEnToOut; K increases by kWhIn
        ammEnToReserves = E - preFeeEnToOut;
        ammKwhReserves = K + kWhIn;

        // Final slippage check after reserves update
        require(enToOut >= minEnToOut, "slippage");

        emit AmmSwapKwhForEnTo(msg.sender, kWhIn, enToOut, ammEnToReserves, ammKwhReserves);
    }

    // ------------------------
    // Reference helpers & views
    // ------------------------

    // Current reference price (kWh per EnTo, 1e18) from bonding curve
    function previewRefPrice18() public view returns (uint256) {
        return BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply);
    }

    // Given kWh, estimate EnTo needed using a reference unit price (not AMM!)
    function previewEnToForKwhRef(uint256 kWh) external view returns (uint256) {
        require(kWh > 0, "kWh=0");
        uint256 p18 = previewRefPrice18();
        return (kWh * ONE) / p18;
    }

    // AMM quote: how much kWh out for enToIn (no fee considered here; front-end should model fee if enabled)
    function previewAmmEnToForKwh(uint256 enToIn) external view returns (uint256 kWhOut) {
        require(enToIn > 0, "enTo=0");
        uint256 E = ammEnToReserves;
        uint256 K = ammKwhReserves;
        require(E > 0 && K > 0, "pool empty");
        kWhOut = (K * enToIn) / (E + enToIn);
    }

    // AMM quote: how much EnTo out for kWhIn
    function previewAmmKwhForEnTo(uint256 kWhIn) external view returns (uint256 enToOut) {
        require(kWhIn > 0, "kWh=0");
        uint256 E = ammEnToReserves;
        uint256 K = ammKwhReserves;
        require(E > 0 && K > 0, "pool empty");
        enToOut = (E * kWhIn) / (K + kWhIn);
    }

    // ------------------------
    // Safety notes
    // ------------------------
    // - This contract treats "energy" as a virtual unit (kWh). Delivery is off-chain/Oracle-governed.
    // - Always use min/max parameters for slippage protection in front-end calls.
    // - Treasury should seed AMM conservatively and monitor reserves.
    // - Consider adding allowlists to limit who can list or buy in production.
}
