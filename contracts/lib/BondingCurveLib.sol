// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingCurveLib
 * @notice Stateless math helpers for EnergyToken pricing.
 *
 * Pricing rule (kWh per EnTo; 18 decimals):
 *   basePrice = 10 kWh/EnTo (scaled by 1e18)
 *   slope: +2% per each 10% drop in circulating supply relative to genesis,
 *          and -2% per each 10% increase.
 *
 * Let:
 *   C0 = genesisSupply
 *   Ct = currentCirculatingSupply
 *
 * Define normalized deviation d = (C0 - Ct) / C0.
 * Then slopePercent = 0.2 * d (because 2% per 10% ⇒ 0.2 × d in "percent units").
 * Implemented with basis points (bps) for integer precision:
 *   slopeBps = 200 bps per 10% ⇒ slopeBpsPerUnit = 2000 bps per 100% deviation.
 *
 * Price formula:
 *   price = BASE_PRICE / (1 + 0.2 * d)  if Ct < C0
 *   price = BASE_PRICE / (1 - 0.2 * |d|) if Ct > C0
 *
 * We compute:
 *   factor = 1e4 + (slopeBpsPerUnit * (C0 - Ct) / C0)  // in bps
 *   price  = BASE_PRICE * 1e4 / factor
 *
 * Where:
 *   BASE_PRICE = 10e18 (10 kWh per EnTo)
 *   slopeBpsPerUnit = 2000 bps (i.e., 20%) per full (100%) deviation.
 *
 * Guards:
 * - If C0 == 0, return BASE_PRICE to avoid division by zero.
 * - Clamp factor to a minimum of 1 (bps) to avoid division by zero in extreme edge cases.
 * - Optionally clamp a maximum factor to avoid unrealistic negative/near-zero prices.
 */
library BondingCurveLib {
    // 10 kWh per EnTo, scaled to 18 decimals for fixed-point math.
    uint256 internal constant BASE_PRICE_18 = 10e18;

    // Basis points (bps) scale: 1% = 100 bps, 100% = 10_000 bps
    uint256 internal constant BPS_DENOM = 10_000;

    // 2% per 10% deviation = 20% per full (100%) deviation = 2,000 bps per 1.0 deviation unit
    uint256 internal constant SLOPE_BPS_PER_UNIT = 2_000; // 20%

    /**
     * @notice Compute the current price in kWh per EnTo (18 decimals) based on circulating vs. genesis supply.
     * @param currentSupply  Current circulating supply (EnTo, 18 decimals)
     * @param genesisSupply  Genesis reference supply (EnTo, 18 decimals)
     * @return price18       Price in kWh per EnTo, scaled by 1e18
     *
     * Intuition:
     * - If currentSupply < genesisSupply, factor > 1 → price goes up (less kWh per EnTo).
     * - If currentSupply > genesisSupply, factor < 1 → price goes down (more kWh per EnTo).
     */
    function currentPrice(uint256 currentSupply, uint256 genesisSupply)
        internal
        pure
        returns (uint256 price18)
    {
        // Guard: undefined baseline ⇒ return base price
        if (genesisSupply == 0) {
            return BASE_PRICE_18;
        }

        // deviation = (C0 - Ct) / C0, in 1e18 fixed-point
        // Use 1e18 scaling to keep precision, then convert to bps.
        // deviation1e18 can be negative if currentSupply > genesisSupply; handle with signed math via casts.
        // In Solidity 0.8+, subtraction checks for underflow; we branch to avoid negatives.
        uint256 factorBps;

        if (currentSupply == genesisSupply) {
            // No deviation ⇒ factor = 1.0 (in bps = 10_000)
            factorBps = BPS_DENOM;
        } else if (currentSupply < genesisSupply) {
            // Supply decreased: price should rise
            // deviation (in 1e18): d = (C0 - Ct) / C0
            uint256 numer = genesisSupply - currentSupply; // safe (we're in this branch)
            // Convert deviation to bps of slope: slopeBps = SLOPE_BPS_PER_UNIT * d
            // d_bps = (numer / C0) in 1e4 units? We'll compute slope directly in bps:
            // slopeBps = SLOPE_BPS_PER_UNIT * numer / C0
            uint256 slopeBps = (SLOPE_BPS_PER_UNIT * numer) / genesisSupply;

            // factor in bps = 1 + slopeBps (in bps terms)
            // e.g., if slopeBps = 200 bps, factor = 10_000 + 200 = 10_200
            factorBps = BPS_DENOM + slopeBps;

            // Safety clamp: avoid overflow or zero
            if (factorBps < 1) factorBps = 1;
        } else {
            // currentSupply > genesisSupply: supply increased, price should fall
            uint256 numer = currentSupply - genesisSupply; // safe (we're in this branch)
            uint256 slopeBps = (SLOPE_BPS_PER_UNIT * numer) / genesisSupply;

            // factor in bps = 1 - slopeBps (lower than 1 if slopeBps>0)
            // Clamp minimum to 1 bps so price doesn't explode toward infinity.
            if (slopeBps >= BPS_DENOM) {
                // Extreme expansion ⇒ set minimal factor to 1 bps
                factorBps = 1;
            } else {
                factorBps = BPS_DENOM - slopeBps;
                if (factorBps < 1) factorBps = 1;
            }
        }

        // price = BASE * (1 / factor), both in fixed-point using bps for factor
        // Multiply first, then divide to keep precision.
        // price18 = BASE_PRICE_18 * BPS_DENOM / factorBps
        // Example: factorBps=10_200 ⇒ price = 10e18 * 10_000 / 10_200 ≈ 9.8039e18
        price18 = (BASE_PRICE_18 * BPS_DENOM) / factorBps;
    }

    /**
     * @notice Helper to preview price impact if a certain amount is burned (reducing circulating supply).
     * @dev This is purely a math helper for front-ends/simulations; it does not update state.
     */
    function priceAfterBurn(
        uint256 currentSupply,
        uint256 genesisSupply,
        uint256 burnAmount
    ) internal pure returns (uint256 price18After) {
        if (burnAmount >= currentSupply) {
            // If burn would zero out supply, approximate to max price (factor tends to +∞).
            // We model this as price → BASE * BPS_DENOM / (BPS_DENOM + SLOPE_BPS_PER_UNIT)
            // but better: just reuse currentPrice with supply clamped to 1 to avoid division by zero.
            return currentPrice(1, genesisSupply);
        }
        uint256 newSupply = currentSupply - burnAmount;
        return currentPrice(newSupply, genesisSupply);
    }

    /**
     * @notice Helper to preview price if a certain amount is minted (increasing circulating supply).
     */
    function priceAfterMint(
        uint256 currentSupply,
        uint256 genesisSupply,
        uint256 mintAmount
    ) internal pure returns (uint256 price18After) {
        uint256 newSupply = currentSupply + mintAmount;
        return currentPrice(newSupply, genesisSupply);
    }
}
