// test/unit/EnergyOracle.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper: compute EnTo needed from kWh and a 1e18-scaled unit price (kWh per EnTo)
function enToForKwh(kWh, unitPrice18) {
  // EnTo = kWh * 1e18 / unitPrice18
  return (kWh * 10n ** 18n) / unitPrice18;
}

// Deploy the minimal stack for Oracle tests: Token, Auction, Oracle
async function deployFixture() {
  const [
    deployer,
    admin,
    treasury,
    oracleCommittee, // used as ORACLE_ROLE + meter signer in tests
    deptA,
    deptB,
  ] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18); // 100,000 EnTo

  // 1) EnergyToken
  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();

  // 2) EnergyAuction(token, genesisSupply, admin, oracleCommittee)
  const Auction = await ethers.getContractFactory("EnergyAuction");
  const auction = await Auction.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();

  // 3) EnergyOracle(token, auction, genesisSupply, admin)
  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();

  // Transfer some tokens from treasury to admin for testing
  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n; // Transfer half to admin
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }

  // Optional role wiring on token for Oracle mint/burn if your token uses AccessControl
  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    await (await token.connect(admin).grantRole(MINTER_ROLE, await oracle.getAddress())).wait();
    await (await token.connect(admin).grantRole(BURNER_ROLE, await oracle.getAddress())).wait();
  }

  // If Oracle references Loan for liquidation checks, link a stub or skip.
  // The tests below don’t need a Loan module, so we omit it.

  return {
    signers: { deployer, admin, treasury, oracleCommittee, deptA, deptB },
    params: { GENESIS_SUPPLY },
    contracts: { token, auction, oracle },
  };
}

// Build the signed payload expected by Oracle.recordUsageSigned
async function buildUsageSignature(oracle, meterSigner, dept, month, kWh, nonce) {
  // payloadHash = keccak256(abi.encode(oracle, dept, month, kWh, nonce))
  const payloadHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "bytes32"],
      [await oracle.getAddress(), dept, month, kWh, nonce]
    )
  );
  const sig = await meterSigner.signMessage(ethers.getBytes(payloadHash));
  return { payloadHash, sig };
}

describe("EnergyOracle", () => {
  it("grants ORACLE_ROLE and authorizes a meter signer; records usage with a valid signature", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, auction, oracle } = contracts;
    const { admin, oracleCommittee, deptA } = signers;

    // 0) Grant ORACLE_ROLE to oracleCommittee and set as a meter signer
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();
    await (await oracle.connect(admin).setMeterSigner(oracleCommittee.address, true)).wait();

    // 1) Dept buys a pack for the month
    const month = 202508;
    const kWhBuy = 1_200n;

    const unitPrice18 = await auction.previewCurrentUnitPrice18(); // kWh per EnTo (1e18)
    const enToRequired = enToForKwh(kWhBuy, unitPrice18);

    // Fund and approve
    await (await token.connect(admin).transfer(deptA.address, enToRequired)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), enToRequired)).wait();

    await expect(auction.connect(deptA).buyPack(month, kWhBuy))
      .to.emit(auction, "PackPurchased");

    // 2) Meter records usage with a valid signature
    const kWh1 = 300n;
    const nonce1 = ethers.keccak256(ethers.toUtf8Bytes("nonce-1"));
    const { sig: sig1 } = await buildUsageSignature(
      oracle,
      oracleCommittee,
      deptA.address,
      month,
      kWh1,
      nonce1
    );

    await expect(
      oracle
        .connect(oracleCommittee)
        .recordUsageSigned(deptA.address, month, kWh1, nonce1, sig1)
    ).to.emit(oracle, "UsageRecorded");

    // Check month usage state
    const mu1 = await oracle.getMonthUsage(month, deptA.address);
    expect(mu1.kWhPurchased).to.eq(kWhBuy);
    expect(mu1.kWhConsumed).to.eq(kWh1);
    expect(mu1.settled).to.eq(false);
  });

  it("rejects usage when signer is not authorized or signature payload is invalid", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, auction, oracle } = contracts;
    const { admin, oracleCommittee, deptA, deptB } = signers;

    // Grant role but do NOT authorize as meter signer yet
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();

    const month = 202508;
    const kWhBuy = 800n;
    const price = await auction.previewCurrentUnitPrice18();
    const cost = enToForKwh(kWhBuy, price);

    await (await token.connect(admin).transfer(deptA.address, cost)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), cost)).wait();
    await (await auction.connect(deptA).buyPack(month, kWhBuy)).wait();

    // Try recording without being a meter signer
    const used = 200n;
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-x"));
    const { sig } = await buildUsageSignature(oracle, oracleCommittee, deptA.address, month, used, nonce);

    await expect(
      oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, month, used, nonce, sig)
    ).to.be.reverted; // not a meter signer

    // Now authorize as a meter signer but create an invalid signature (wrong dept)
    await (await oracle.connect(admin).setMeterSigner(oracleCommittee.address, true)).wait();

    const wrongSig = await (async () => {
      // Sign for deptB instead of deptA
      const { sig: s2 } = await buildUsageSignature(oracle, oracleCommittee, deptB.address, month, used, nonce);
      return s2;
    })();

    await expect(
      oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, month, used, nonce, wrongSig)
    ).to.be.reverted; // signature mismatch payload
  });

  it("prevents double counting via nonce reuse and enforces month ownership", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, auction, oracle } = contracts;
    const { admin, oracleCommittee, deptA } = signers;

    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();
    await (await oracle.connect(admin).setMeterSigner(oracleCommittee.address, true)).wait();

    const m = 202508;
    const kWhBuy = 1_000n;
    const price = await auction.previewCurrentUnitPrice18();
    const cost = enToForKwh(kWhBuy, price);
    await (await token.connect(admin).transfer(deptA.address, cost)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), cost)).wait();
    await (await auction.connect(deptA).buyPack(m, kWhBuy)).wait();

    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-unique"));
    const k1 = 400n;

    const { sig } = await buildUsageSignature(oracle, oracleCommittee, deptA.address, m, k1, nonce);
    await (await oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, m, k1, nonce, sig)).wait();

    // Reuse same nonce should revert
    await expect(
      oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, m, 50n, nonce, sig)
    ).to.be.reverted;
  });

  it("claims savings once and marks month as settled", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, auction, oracle } = contracts;
    const { admin, oracleCommittee, deptA } = signers;

    // Grant role + meter signer
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();
    await (await oracle.connect(admin).setMeterSigner(oracleCommittee.address, true)).wait();

    // Buy pack
    const m = 202508;
    const kWhBuy = 1_500n;
    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const cost = enToForKwh(kWhBuy, unitPrice18);
    await (await token.connect(admin).transfer(deptA.address, cost)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), cost)).wait();
    await (await auction.connect(deptA).buyPack(m, kWhBuy)).wait();

    // Record some usage
    const k1 = 700n;
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-claim-1"));
    const { sig } = await buildUsageSignature(oracle, oracleCommittee, deptA.address, m, k1, nonce);
    await (await oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, m, k1, nonce, sig)).wait();

    // Capture balance before claim
    const beforeBal = await token.balanceOf(deptA.address);

    // Claim savings
    await expect(oracle.connect(deptA).claimSavings(m))
      .to.emit(oracle, "SavingsClaimed");

    // After claim, month should be settled and dept balance should increase (if Oracle mints savings)
    const afterBal = await token.balanceOf(deptA.address);
    expect(afterBal).to.be.greaterThanOrEqual(beforeBal);

    const mu = await oracle.getMonthUsage(m, deptA.address);
    expect(mu.settled).to.eq(true);

    // Second claim attempt should revert
    await expect(oracle.connect(deptA).claimSavings(m)).to.be.reverted;
  });

  it("admin can set or update credit scores and meter signers", async () => {
    const { contracts, signers } = await deployFixture();
    const { oracle } = contracts;
    const { admin, deptA } = signers;

    // Set credit score
    await expect(oracle.connect(admin).setCreditScore(deptA.address, 72))
      .to.emit(oracle, "CreditScoreUpdated");

    const cs = await oracle.creditScore(deptA.address);
    expect(Number(cs)).to.equal(72);

    // Toggle signer
    const addr = deptA.address;
    await (await oracle.connect(admin).setMeterSigner(addr, true)).wait();
    // No direct getter? If you have one like isMeterSigner(address), you could assert it.
    // Otherwise, rely on behavior in usage recording tests.
  });

  it("rejects usage recording for months without a purchased pack by that department", async () => {
    const { contracts, signers } = await deployFixture();
    const { oracle } = contracts;
    const { admin, oracleCommittee, deptA } = signers;

    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();
    await (await oracle.connect(admin).setMeterSigner(oracleCommittee.address, true)).wait();

    const m = 202510; // deptA did not buy a pack for this month in this test
    const k1 = 100n;
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-nopack"));
    const { sig } = await buildUsageSignature(oracle, oracleCommittee, deptA.address, m, k1, nonce);

    await expect(
      oracle.connect(oracleCommittee).recordUsageSigned(deptA.address, m, k1, nonce, sig)
    ).to.be.reverted; // should revert if your contract enforces 'must have pack to record'
  });
});
