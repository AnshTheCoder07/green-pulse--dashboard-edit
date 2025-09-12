// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
EnergyToken (EnTo)
- ERC20 with 18 decimals
- EIP-712 Permit (gasless approvals)
- ERC20Votes (on-chain governance snapshots)
- Role-based access control:
    * DEFAULT_ADMIN_ROLE  – can assign/revoke roles, pause/unpause
    * MINTER_ROLE         – may mint EnTo (Oracle/Savings modules)
    * BURNER_ROLE         – may burn EnTo from accounts (Oracle metering)
    * TREASURY_ROLE       – reserved for fiat gateway or treasury ops
- Pausable: emergency stop for transfers/mints/burns
- Supply guardrails: optional maxSupply check if you want to cap expansion (disabled by default)
*/

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract EnergyToken is ERC20, ERC20Permit, ERC20Votes, AccessControl, Pausable {
    using SafeCast for uint256;

    // Roles
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE   = keccak256("BURNER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    // Constants
    uint8   private constant DECIMALS_ = 18;
    uint256 public constant GENESIS_SUPPLY = 100_000 * 1e18; // initial float for the prototype
    uint256 public constant AIRDROP_AMOUNT = 1_000 * 1e18;   // starter for new departments

    // Optional supply cap (set to 0 to disable hard cap)
    uint256 public immutable maxSupply; // e.g., 0 means “no cap”

    // Events
    event Airdropped(address indexed to, uint256 amount);
    event AdminPaused(address indexed by);
    event AdminUnpaused(address indexed by);

    constructor(
        address admin_,
        address treasury_,
        uint256 maxSupply_ // set 0 to disable or a hard cap threshold (>= GENESIS_SUPPLY)
    )
        ERC20("EnergyToken", "EnTo")
        ERC20Permit("EnergyToken")
    {
        require(admin_ != address(0), "admin is zero");
        require(treasury_ != address(0), "treasury is zero");
        if (maxSupply_ != 0) {
            require(maxSupply_ >= GENESIS_SUPPLY, "cap < genesis");
        }
        maxSupply = maxSupply_;

        // Roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(TREASURY_ROLE, treasury_);

        // Mint initial supply to treasury (or admin depending on your flows)
        _mint(treasury_, GENESIS_SUPPLY);
    }

    // -------------------------
    // ERC-20 base overrides
    // -------------------------
    function decimals() public pure override returns (uint8) {
        return DECIMALS_;
    }

    // -------------------------
    // Access-controlled actions
    // -------------------------

    // Minting: restricted to MINTER_ROLE (e.g., Oracle, Savings contract)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        _checkedMint(to, amount);
    }

    // Burning from an account: restricted to BURNER_ROLE (e.g., Oracle metering)
    // NOTE: this bypasses allowance for oracle-driven burns; use cautiously.
    function burnFrom(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(from, amount);
    }

    // Standard user burn (optional): requires allowance or self-call
    function burn(uint256 amount) external whenNotPaused {
        _burn(msg.sender, amount);
    }

    // Admin airdrop for new departments
    function airdrop(address dept) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(dept != address(0), "dept is zero");
        _checkedMint(dept, AIRDROP_AMOUNT);
        emit Airdropped(dept, AIRDROP_AMOUNT);
    }

    // Emergency controls
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit AdminPaused(msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit AdminUnpaused(msg.sender);
    }

    // -------------------------
    // Internal helpers
    // -------------------------
    function _checkedMint(address to, uint256 amount) internal {
        if (maxSupply != 0) {
            require(totalSupply() + amount <= maxSupply, "cap exceeded");
        }
        _mint(to, amount);
    }

    // -------------------------
    // Hooks & overrides
    // -------------------------

    // Pause transfers when paused == true
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
        whenNotPaused
    {
        super._update(from, to, value);
    }

    // Override nonces function to resolve multiple inheritance conflict
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
