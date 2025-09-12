// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
FiatGateway.sol
- Converts EnTo ↔ fiat (e.g., INR) using a configurable market rate and spreads.
- Handles two-step off-chain settlement with auditable events.
- Enforces per-day redemption caps and max per-tx limits to protect treasury.
- Role-gated admin and price-feeder; pausability for emergencies.

Key terms:
- marketRate: EnTo per 1 INR (18 decimals). Example: if 1 INR buys 0.1 EnTo, marketRate = 0.1e18.
- buySpreadBps: EnTo discount when users BUY EnTo with INR (gateway sells EnTo at a premium).
- sellSpreadBps: EnTo discount when users SELL EnTo for INR (gateway buys EnTo at a discount).
- Treasury: holds EnTo liquidity; receives EnTo on sells and sends EnTo on buys.

Important:
- This contract does NOT mint or burn EnTo; it only transfers. Mint/burn stays in your Oracle/Savings.
- Off-chain banking must be handled by your backend. This contract emits events and expects confirm calls.

Flow:
- Buy: user initiates a buy request specifying INR amount -> backend collects INR -> backend calls confirmFiatDeposit to deliver EnTo at (marketRate * (1 - buySpread)).
- Sell: user transfers EnTo into escrow via initiateSell -> backend pays INR off-chain -> backend calls confirmFiatPayout; otherwise backend may call refundSell if payout fails.
*/

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IEnergyToken is IERC20 {}

contract FiatGateway is AccessControl, Pausable, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURY_ROLE    = keccak256("TREASURY_ROLE");
    bytes32 public constant PRICE_FEEDER     = keccak256("PRICE_FEEDER");   // can set market rate
    bytes32 public constant SETTLEMENT_ROLE  = keccak256("SETTLEMENT_ROLE"); // backend confirms settlements

    // External
    IEnergyToken public immutable token;
    address public treasury; // EnTo liquidity wallet

    // Market config (all rates in 18 decimals or basis points where noted)
    uint256 public marketRateEnToPerINR18; // EnTo per INR, 18 decimals
    uint256 public buySpreadBps = 500;     // +5% premium for buyers (they get fewer EnTo)
    uint256 public sellSpreadBps = 500;    // -5% discount for sellers (they receive fewer INR-equivalent EnTo)
    uint256 public constant BPS_DENOM = 10_000;

    // Limits
    uint256 public maxSingleBuyINR;        // max INR per single buy request (off-chain reference)
    uint256 public maxSingleSellEnTo;      // max EnTo per single sell request
    uint256 public dailyRedeemCapEnTo;     // cap on total EnTo sold by gateway (user→INR) per day
    uint256 public dailyRedeemUsedEnTo;    // used amount for the day
    uint256 public lastRedeemDay;          // day index

    // Requests
    enum RequestType { Buy, Sell }
    enum RequestStatus { Pending, Completed, Refunded, Cancelled }

    struct Request {
        RequestType typ;
        address user;
        uint256 inAmount;   // INR amount for Buy; EnTo amount for Sell
        uint256 outAmount;  // EnTo promised for Buy; INR (as EnTo-equivalent) promised for Sell (for logging)
        uint256 rateEnToPerINR18; // snapshot of marketRate at request creation
        uint256 spreadBps;  // snapshot of spread used
        uint256 createdAt;
        RequestStatus status;
    }

    uint256 public nextRequestId;
    mapping(uint256 => Request) public requests;

    // Events
    event TreasuryUpdated(address indexed treasury, address indexed by);
    event MarketRateUpdated(uint256 rateEnToPerINR18, address indexed by);
    event SpreadUpdated(uint256 buySpreadBps, uint256 sellSpreadBps, address indexed by);
    event LimitsUpdated(uint256 maxBuyINR, uint256 maxSellEnTo, uint256 dailyRedeemCapEnTo, address indexed by);

    event BuyInitiated(uint256 indexed reqId, address indexed user, uint256 inINR, uint256 outEnTo, uint256 rate, uint256 spread);
    event BuySettled(uint256 indexed reqId, address indexed user, uint256 enToTransferred);
    event SellInitiated(uint256 indexed reqId, address indexed user, uint256 inEnTo, uint256 outINREquiv, uint256 rate, uint256 spread);
    event SellSettled(uint256 indexed reqId, address indexed user, uint256 enToEscrowed);
    event SellRefunded(uint256 indexed reqId, address indexed user, uint256 enToReturned);

    event PausedBy(address indexed by);
    event UnpausedBy(address indexed by);

    constructor(address token_, address admin_, address treasury_, uint256 initialRateEnToPerINR18) {
        require(token_ != address(0), "token zero");
        require(admin_ != address(0), "admin zero");
        require(treasury_ != address(0), "treasury zero");
        require(initialRateEnToPerINR18 > 0, "rate zero");

        token = IEnergyToken(token_);
        treasury = treasury_;
        marketRateEnToPerINR18 = initialRateEnToPerINR18;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(TREASURY_ROLE, treasury_);
        _grantRole(PRICE_FEEDER, admin_);
        _grantRole(SETTLEMENT_ROLE, admin_);

        // sensible defaults
        maxSingleBuyINR = 1_000_000e18;     // interpret as "INR with 18 decimals" for uniformity
        maxSingleSellEnTo = 100_000e18;
        dailyRedeemCapEnTo = 50_000e18;
        lastRedeemDay = _dayIndex(block.timestamp);
    }

    // -------------------
    // Admin/Config
    // -------------------
    function setTreasury(address t) external onlyRole(ADMIN_ROLE) {
        require(t != address(0), "treasury zero");
        // revoke and grant role
        _revokeRole(TREASURY_ROLE, treasury);
        treasury = t;
        _grantRole(TREASURY_ROLE, t);
        emit TreasuryUpdated(t, msg.sender);
    }

    function setMarketRate(uint256 rateEnToPerINR18) external onlyRole(PRICE_FEEDER) {
        require(rateEnToPerINR18 > 0, "rate zero");
        marketRateEnToPerINR18 = rateEnToPerINR18;
        emit MarketRateUpdated(rateEnToPerINR18, msg.sender);
    }

    function setSpreads(uint256 buyBps, uint256 sellBps) external onlyRole(ADMIN_ROLE) {
        require(buyBps <= 2_000 && sellBps <= 2_000, "spread too high"); // cap at 20% for safety
        buySpreadBps = buyBps;
        sellSpreadBps = sellBps;
        emit SpreadUpdated(buyBps, sellBps, msg.sender);
    }

    function setLimits(uint256 maxBuyINR, uint256 maxSellEnTo_, uint256 dailyCapEnTo) external onlyRole(ADMIN_ROLE) {
        maxSingleBuyINR = maxBuyINR;
        maxSingleSellEnTo = maxSellEnTo_;
        dailyRedeemCapEnTo = dailyCapEnTo;
        emit LimitsUpdated(maxBuyINR, maxSellEnTo_, dailyCapEnTo, msg.sender);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit PausedBy(msg.sender);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit UnpausedBy(msg.sender);
    }

    // -------------------
    // User Flows
    // -------------------

    // 1) BUY FLOW (INR -> EnTo)
    // User creates a buy request stating how much INR they have sent off-chain.
    // Backend must verify INR arrival and then call confirmFiatDeposit to send EnTo to the user.
    function initiateBuy(uint256 inINR) external whenNotPaused returns (uint256 reqId, uint256 outEnToQuoted) {
        require(inINR > 0, "inINR=0");
        require(inINR <= maxSingleBuyINR, "exceeds max buy");

        (reqId, outEnToQuoted) = _newBuyRequest(msg.sender, inINR);
        emit BuyInitiated(reqId, msg.sender, inINR, outEnToQuoted, marketRateEnToPerINR18, buySpreadBps);
    }

    // Backend confirms INR received and delivers EnTo from treasury to user.
    function confirmFiatDeposit(uint256 reqId) external nonReentrant onlyRole(SETTLEMENT_ROLE) {
        Request storage r = requests[reqId];
        require(r.typ == RequestType.Buy, "not buy");
        require(r.status == RequestStatus.Pending, "not pending");

        // Transfer EnTo from treasury to user
        require(token.transferFrom(treasury, r.user, r.outAmount), "treasury xfer failed");
        r.status = RequestStatus.Completed;

        emit BuySettled(reqId, r.user, r.outAmount);
    }

    // 2) SELL FLOW (EnTo -> INR)
    // User initiates a sell; EnTo is pulled into escrow immediately.
    // Backend then pays INR off-chain and confirms. If payout fails, backend can refund.
    function initiateSell(uint256 inEnTo) external whenNotPaused nonReentrant returns (uint256 reqId, uint256 outINREquiv) {
        require(inEnTo > 0, "inEnTo=0");
        require(inEnTo <= maxSingleSellEnTo, "exceeds max sell");

        // Enforce daily cap
        _rollDailyCap();
        require(dailyRedeemUsedEnTo + inEnTo <= dailyRedeemCapEnTo, "daily cap");

        // Pull EnTo from user into escrow (this contract)
        require(token.transferFrom(msg.sender, address(this), inEnTo), "escrow xfer failed");

        (reqId, outINREquiv) = _newSellRequest(msg.sender, inEnTo);

        // Account against daily cap now that escrow is in
        dailyRedeemUsedEnTo += inEnTo;

        emit SellInitiated(reqId, msg.sender, inEnTo, outINREquiv, marketRateEnToPerINR18, sellSpreadBps);
    }

    // Backend confirms INR payout has been made; move escrowed EnTo to treasury.
    function confirmFiatPayout(uint256 reqId) external nonReentrant onlyRole(SETTLEMENT_ROLE) {
        Request storage r = requests[reqId];
        require(r.typ == RequestType.Sell, "not sell");
        require(r.status == RequestStatus.Pending, "not pending");

        // Move escrowed EnTo to treasury
        require(token.transfer(treasury, r.inAmount), "to treasury failed");

        r.status = RequestStatus.Completed;
        emit SellSettled(reqId, r.user, r.inAmount);
    }

    // Backend can refund EnTo to user if payout failed or cancelled within policy.
    function refundSell(uint256 reqId) external nonReentrant onlyRole(SETTLEMENT_ROLE) {
        Request storage r = requests[reqId];
        require(r.typ == RequestType.Sell, "not sell");
        require(r.status == RequestStatus.Pending, "not pending");

        // Return EnTo from escrow to user
        require(token.transfer(r.user, r.inAmount), "refund failed");
        r.status = RequestStatus.Refunded;

        emit SellRefunded(reqId, r.user, r.inAmount);
    }

    // -------------------
    // Internals
    // -------------------
    function _newBuyRequest(address user, uint256 inINR) internal returns (uint256 reqId, uint256 outEnTo) {
        // outEnTo = inINR * marketRate * (1 - buySpread)
        // All 18 decimals: treat INR as 18 decimals for uniform math
        uint256 rate = marketRateEnToPerINR18;
        uint256 spread = buySpreadBps;
        uint256 enToAtPar = (inINR * rate) / 1e18;
        uint256 discount = (enToAtPar * spread) / BPS_DENOM;
        outEnTo = enToAtPar - discount;
        require(outEnTo > 0, "quote=0");

        reqId = ++nextRequestId;
        requests[reqId] = Request({
            typ: RequestType.Buy,
            user: user,
            inAmount: inINR,
            outAmount: outEnTo,
            rateEnToPerINR18: rate,
            spreadBps: spread,
            createdAt: block.timestamp,
            status: RequestStatus.Pending
        });
    }

    function _newSellRequest(address user, uint256 inEnTo) internal returns (uint256 reqId, uint256 outINREquiv) {
        // outINREquiv = inEnTo / marketRate adjusted for sell spread
        // Rearranged: INR = EnTo / rate
        uint256 rate = marketRateEnToPerINR18;
        uint256 spread = sellSpreadBps;
        require(rate > 0, "rate=0");

        uint256 inrAtPar = (inEnTo * 1e18) / rate;
        uint256 discount = (inrAtPar * spread) / BPS_DENOM;
        outINREquiv = inrAtPar - discount;
        require(outINREquiv > 0, "quote=0");

        reqId = ++nextRequestId;
        requests[reqId] = Request({
            typ: RequestType.Sell,
            user: user,
            inAmount: inEnTo,
            outAmount: outINREquiv, // for logging; actual INR is off-chain
            rateEnToPerINR18: rate,
            spreadBps: spread,
            createdAt: block.timestamp,
            status: RequestStatus.Pending
        });
    }

    function _dayIndex(uint256 ts) internal pure returns (uint256) {
        return ts / 1 days;
    }

    function _rollDailyCap() internal {
        uint256 d = _dayIndex(block.timestamp);
        if (d != lastRedeemDay) {
            lastRedeemDay = d;
            dailyRedeemUsedEnTo = 0;
        }
    }

    // -------------------
    // Views
    // -------------------
    function previewBuyEnTo(uint256 inINR) external view returns (uint256 outEnTo) {
        if (inINR == 0 || marketRateEnToPerINR18 == 0) return 0;
        uint256 enToAtPar = (inINR * marketRateEnToPerINR18) / 1e18;
        uint256 discount = (enToAtPar * buySpreadBps) / BPS_DENOM;
        outEnTo = enToAtPar - discount;
    }

    function previewSellINR(uint256 inEnTo) external view returns (uint256 outINREquiv) {
        if (inEnTo == 0 || marketRateEnToPerINR18 == 0) return 0;
        uint256 inrAtPar = (inEnTo * 1e18) / marketRateEnToPerINR18;
        uint256 discount = (inrAtPar * sellSpreadBps) / BPS_DENOM;
        outINREquiv = inrAtPar - discount;
    }
}
