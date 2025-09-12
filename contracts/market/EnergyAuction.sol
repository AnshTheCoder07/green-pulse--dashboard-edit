// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
EnergyAuction.sol
- Departments buy monthly EnergyPacks (kWh) by paying EnTo at a bonding-curve price.
- Baselines are set per department per month by an authorized “oracle committee” (multisig).
- Uses BondingCurveLib to compute the current unit price (kWh per EnTo, 1e18).
- Records each department’s purchased kWh and EnTo paid for the month.
- Optionally enforces one-pack-per-month; otherwise supports multiple top-ups using weighted avg price.
- Emits detailed events for analytics and UI.

Assumptions:
- IEnergyToken represents your EnergyToken contract (ERC20-compatible with totalSupply()).
- BondingCurveLib.currentPrice(currentSupply, genesisSupply) returns kWh per EnTo in 1e18 fixed point.
- “Month” is a uint like 202508 (yyyymm). Keep consistent across your app.
*/

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BondingCurveLib} from "../lib/BondingCurveLib.sol";

interface IEnergyToken is IERC20 {
    function totalSupply() external view returns (uint256);
}

contract EnergyAuction is AccessControl, ReentrancyGuard {
    // ------------------------
    // Roles
    // ------------------------
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE"); // multisig to set baselines
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");  // config updates

    // ------------------------
    // External contracts
    // ------------------------
    IEnergyToken public immutable token;

    // We pass the reference "genesis supply" into constructor so we don’t depend on a public constant in the token.
    uint256 public immutable genesisSupply;

    // ------------------------
    // Config
    // ------------------------
    // Enforce a single purchase per month (true), or allow multiple top-ups (false).
    bool public onePackPerMonth = true;

    // Cap a single buy’s kWh to avoid mistakes; tune for your demo.
    uint256 public maxPackKWhPerBuy = 10_000_000;

    // Optional sanity range for month IDs
    uint256 public minMonth = 200001; // 2000-01
    uint256 public maxMonth = 299912; // 2999-12

    // ------------------------
    // Baselines & Purchases
    // ------------------------
    struct Baseline {
        uint256 kWh;       // approved (AI or override) baseline
        bytes32 metaHash;  // IPFS/JSON hash for audit
        bool    set;
    }

    struct Pack {
        uint256 kWhPurchased;  // total kWh bought for this month
        uint256 enToPaid;      // total EnTo paid (1e18)
        uint256 unitPrice18;   // weighted average kWh per EnTo (1e18)
        bool    exists;
    }

    // month => dept => baseline
    mapping(uint256 => mapping(address => Baseline)) public baselines;

    // month => dept => pack
    mapping(uint256 => mapping(address => Pack)) public packs;

    // Aggregate monthly stats
    struct MonthStats {
        uint256 totalKWhSold;
        uint256 totalEnToCollected;
        uint256 buyers;
    }
    mapping(uint256 => MonthStats) public monthStats;

    // ------------------------
    // Events
    // ------------------------
    event BaselineSet(
        uint256 indexed month,
        address indexed dept,
        uint256 kWh,
        bytes32 metaHash,
        address indexed by
    );

    event PackPurchased(
        uint256 indexed month,
        address indexed dept,
        uint256 kWh,
        uint256 enToPaid,
        uint256 unitPrice18,
        uint256 timestamp
    );

    event ConfigUpdated(string indexed key, uint256 value, address indexed by);
    event OnePackRuleUpdated(bool enabled, address indexed by);

    // ------------------------
    // Constructor
    // ------------------------
    constructor(
        address token_,
        uint256 genesisSupply_,
        address admin_,
        address oracleCommittee_
    ) {
        require(token_ != address(0), "token zero");
        require(admin_ != address(0), "admin zero");
        require(oracleCommittee_ != address(0), "oracle zero");
        require(genesisSupply_ > 0, "genesis=0");

        token = IEnergyToken(token_);
        genesisSupply = genesisSupply_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(ORACLE_ROLE, oracleCommittee_);
    }

    // ------------------------
    // Admin
    // ------------------------
    function setOnePackPerMonth(bool enabled) external onlyRole(ADMIN_ROLE) {
        onePackPerMonth = enabled;
        emit OnePackRuleUpdated(enabled, msg.sender);
    }

    function setMaxPackKWhPerBuy(uint256 maxKWh) external onlyRole(ADMIN_ROLE) {
        require(maxKWh > 0, "maxKWh=0");
        maxPackKWhPerBuy = maxKWh;
        emit ConfigUpdated("maxPackKWhPerBuy", maxKWh, msg.sender);
    }

    function setMonthRange(uint256 minM, uint256 maxM) external onlyRole(ADMIN_ROLE) {
        require(minM <= maxM, "range");
        minMonth = minM;
        maxMonth = maxM;
        emit ConfigUpdated("minMonth", minM, msg.sender);
        emit ConfigUpdated("maxMonth", maxM, msg.sender);
    }

    // ------------------------
    // Oracle (multisig) functions
    // ------------------------
    function setBaseline(
        uint256 month,
        address dept,
        uint256 kWh,
        bytes32 metaHash
    ) external onlyRole(ORACLE_ROLE) {
        _assertMonth(month);
        require(dept != address(0), "dept zero");
        require(kWh > 0, "kWh=0");

        Baseline storage b = baselines[month][dept];
        b.kWh = kWh;
        b.metaHash = metaHash;
        b.set = true;

        emit BaselineSet(month, dept, kWh, metaHash, msg.sender);
    }

    // ------------------------
    // Purchase logic
    // ------------------------
    function buyPack(uint256 month, uint256 kWhDesired)
        external
        nonReentrant
    {
        _assertMonth(month);
        require(kWhDesired > 0, "kWh=0");
        require(kWhDesired <= maxPackKWhPerBuy, "kWh>max");

        Pack storage p = packs[month][msg.sender];
        if (onePackPerMonth) {
            require(!p.exists, "already bought");
        }

        // Compute current unit price (kWh per EnTo, 1e18)
        uint256 unitPrice18 = BondingCurveLib.currentPrice(
            token.totalSupply(),   // use totalSupply as proxy for circulating supply
            genesisSupply
        );
        require(unitPrice18 > 0, "bad price");

        // EnTo required = kWh * 1e18 / unitPrice18
        uint256 enToRequired = (kWhDesired * 1e18) / unitPrice18;
        require(enToRequired > 0, "enTo=0");

        // Pull EnTo from buyer (buyer must approve this contract first or use permit elsewhere)
        bool ok = token.transferFrom(msg.sender, address(this), enToRequired);
        require(ok, "transferFrom failed");

        // Update pack
        if (!p.exists) {
            p.exists = true;
            p.kWhPurchased = kWhDesired;
            p.enToPaid = enToRequired;
            p.unitPrice18 = unitPrice18;
            monthStats[month].buyers += 1;
        } else {
            // multiple buys: accumulate and update weighted average price
            uint256 newK = p.kWhPurchased + kWhDesired;
            uint256 newEnTo = p.enToPaid + enToRequired;
            uint256 avgPrice18 = (newK * 1e18) / newEnTo;

            p.kWhPurchased = newK;
            p.enToPaid = newEnTo;
            p.unitPrice18 = avgPrice18;
        }

        // Update month aggregates
        monthStats[month].totalKWhSold += kWhDesired;
        monthStats[month].totalEnToCollected += enToRequired;

        emit PackPurchased(month, msg.sender, kWhDesired, enToRequired, unitPrice18, block.timestamp);
    }

    // ------------------------
    // Views & helpers
    // ------------------------
    function previewCurrentUnitPrice18() external view returns (uint256) {
        return BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply);
    }

    function previewEnToFor(uint256 kWh) external view returns (uint256 enToRequired) {
        require(kWh > 0, "kWh=0");
        uint256 unitPrice18 = BondingCurveLib.currentPrice(token.totalSupply(), genesisSupply);
        require(unitPrice18 > 0, "bad price");
        enToRequired = (kWh * 1e18) / unitPrice18;
    }

    function getPack(uint256 month, address dept) external view returns (Pack memory) {
        return packs[month][dept];
    }

    function getBaseline(uint256 month, address dept) external view returns (Baseline memory) {
        return baselines[month][dept];
    }

    function _assertMonth(uint256 month) internal view {
        require(month >= minMonth && month <= maxMonth, "month out of range");
    }
}
