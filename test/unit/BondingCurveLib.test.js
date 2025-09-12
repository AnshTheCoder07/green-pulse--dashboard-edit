const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BondingCurveLib (via BondingCurveHarness)", () => {
  let harness;

  before(async () => {
    // Ensure you've added contracts/test/BondingCurveHarness.sol as provided.
    // Hardhat will compile it, and you can get the factory normally:
    const Harness = await ethers.getContractFactory("BondingCurveHarness");
    harness = await Harness.deploy();
    await harness.waitForDeployment();
  });

  it("returns a positive price for reasonable inputs", async () => {
    const totalSupply = ethers.parseUnits("100000", 18); // 100,000 EnTo
    const genesisSupply = ethers.parseUnits("100000", 18);
    const p = await harness.currentPrice(totalSupply, genesisSupply);
    expect(p).to.be.a("bigint");
    expect(p).to.be.greaterThan(0n);
  });

  it("handles edge cases: zero totalSupply still yields a non-zero fallback style price", async () => {
    // Your library should avoid returning 0 for valid genesisSupply.
    const totalSupply = 0n;
    const genesisSupply = ethers.parseUnits("100000", 18);
    const p = await harness.currentPrice(totalSupply, genesisSupply);
    expect(p).to.be.greaterThan(0n);
  });

  it("monotonic behavior across supply (adjust assertions to your economics)", async () => {
    // If your price is 'kWh per EnTo' and should increase as totalSupply grows, keep >=.
    // If the opposite is intended, flip the inequalities accordingly.

    const genesisSupply = ethers.parseUnits("100000", 18);

    const s1 = ethers.parseUnits("50000", 18);
    const s2 = ethers.parseUnits("100000", 18);
    const s3 = ethers.parseUnits("200000", 18);

    const p1 = await harness.currentPrice(s1, genesisSupply);
    const p2 = await harness.currentPrice(s2, genesisSupply);
    const p3 = await harness.currentPrice(s3, genesisSupply);

    // Example: non-decreasing with supply
    expect(p2).to.be.greaterThanOrEqual(p1);
    expect(p3).to.be.greaterThanOrEqual(p2);
  });

  it("scales safely for very large supplies (no overflow/underflow, non-zero)", async () => {
    const genesisSupply = ethers.parseUnits("100000", 18);
    const hugeSupply = ethers.parseUnits("1000000000", 18); // 1,000,000,000 EnTo
    const p = await harness.currentPrice(hugeSupply, genesisSupply);
    expect(p).to.be.a("bigint");
    expect(p).to.be.greaterThan(0n);
  });

  it("responds to different genesisSupply values consistently", async () => {
    const totalSupply = ethers.parseUnits("200000", 18);
    const g1 = ethers.parseUnits("100000", 18);
    const g2 = ethers.parseUnits("200000", 18);

    const p1 = await harness.currentPrice(totalSupply, g1);
    const p2 = await harness.currentPrice(totalSupply, g2);

    expect(p1).to.be.greaterThan(0n);
    expect(p2).to.be.greaterThan(0n);
    // If your formula depends on totalSupply/genesisSupply ratio, prices should differ:
    expect(p1).to.not.equal(p2);
  });

  // If you have known reference points from a spec or spreadsheet, add exact/approx checks here.
  // it("matches reference samples (optional)", async () => {
  //   const totalSupply = ethers.parseUnits("150000", 18);
  //   const genesisSupply = ethers.parseUnits("100000", 18);
  //   const expected = ethers.parseUnits("0.85", 18); // example placeholder
  //   const p = await harness.currentPrice(totalSupply, genesisSupply);
  //   // For approximate checks, compare ratio within tolerance or subtract and compare absolute diff
  //   const diff = p > expected ? p - expected : expected - p;
  //   const tolerance = ethers.parseUnits("0.01", 18); // 1% tolerance example for demo
  //   expect(diff).to.be.lte(tolerance);
  // });
});
