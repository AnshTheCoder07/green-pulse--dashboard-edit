// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Path relative to this file: contracts/test/BondingCurveHarness.sol
// Your library lives at contracts/lib/BondingCurveLib.sol
import "../lib/BondingCurveLib.sol";

contract BondingCurveHarness {
    using BondingCurveLib for uint256;

    // Expose the library's pricing function for testing
    function currentPrice(uint256 totalSupply, uint256 genesisSupply) external pure returns (uint256) {
        return BondingCurveLib.currentPrice(totalSupply, genesisSupply);
    }

    // If your library has more functions (e.g., quotes), expose them similarly:
    // function quoteBuy(uint256 totalSupply, uint256 genesisSupply, uint256 enToIn) external pure returns (uint256) {
    //     return BondingCurveLib.quoteBuy(totalSupply, genesisSupply, enToIn);
    // }
    //
    // function quoteSell(uint256 totalSupply, uint256 genesisSupply, uint256 kWhIn) external pure returns (uint256) {
    //     return BondingCurveLib.quoteSell(totalSupply, genesisSupply, kWhIn);
    // }
}
