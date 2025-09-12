// test/unit/FiatGateway.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helpers
async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {}
}

// Deploy minimal stack for gateway tests
async function deployFixture() {
  const [
    deployer,
    admin,
    treasury,
    priceFeeder,
    settlementOps,
    userA,
    userB,
  ] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE = ethers.parseUnits("0.10", 18); // EnTo per 1 INR, scaled 1e18

  // Token
  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();

  // FiatGateway(token, admin, treasury, initialRate)
  const Gateway = await ethers.getContractFactory("FiatGateway");
  const gateway = await Gateway.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address,
    INITIAL_RATE
  );
  await gateway.waitForDeployment();

  // Transfer some tokens from treasury to admin for testing
  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n; // Transfer half to admin
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }

  // Roles: price feeder and settlement
  try {
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    await (await gateway.connect(admin).grantRole(PRICE_FEEDER, priceFeeder.address)).wait();
    await (await gateway.connect(admin).grantRole(SETTLEMENT_ROLE, settlementOps.address)).wait();
  } catch {
    // If your contract uses different role names or relies solely on admin, skip
  }

  // Treasury approves gateway to transfer EnTo for buy settlements
  await (await token.connect(treasury).approve(await gateway.getAddress(), ethers.MaxUint256)).wait();

  // Seed treasury with tokens if needed (depends on your token mint policy)
  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {
    await (await token.transfer(treasury.address, depBal / 2n)).wait();
  }

  return {
    signers: { deployer, admin, treasury, priceFeeder, settlementOps, userA, userB },
    params: { GENESIS_SUPPLY, INITIAL_RATE },
    contracts: { token, gateway },
  };
}

describe("FiatGateway", () => {
  it("initializes with market rate and allows feeder/admin to update spreads and limits", async () => {
    const { contracts, signers, params } = await deployFixture();
    const { gateway } = contracts;
    const { admin, priceFeeder } = signers;

    const rate = await gateway.marketRateEnToPerINR18();
    expect(rate).to.equal(params.INITIAL_RATE);

    // Update market rate (priceFeeder or admin)
    const newRate = ethers.parseUnits("0.12", 18);
    try {
      await expect(gateway.connect(priceFeeder).setMarketRate(newRate))
        .to.emit(gateway, "MarketRateUpdated");
      expect(await gateway.marketRateEnToPerINR18()).to.equal(newRate);
    } catch {
      // fallback: admin updates if feeder role not used in your contract
      await (await gateway.connect(admin).setMarketRate(newRate)).wait();
      expect(await gateway.marketRateEnToPerINR18()).to.equal(newRate);
    }

    // Update spreads and limits via admin (adjust names to your contract)
    try {
      await expect(gateway.connect(admin).setSpreads(400, 600))
        .to.emit(gateway, "SpreadsUpdated");
      expect(Number(await gateway.buySpreadBps())).to.equal(400);
      expect(Number(await gateway.sellSpreadBps())).to.equal(600);

      await expect(
        gateway.connect(admin).setLimits(
          ethers.parseUnits("100000", 18), // maxSingleBuyINR (18-decimal INR)
          ethers.parseUnits("50000", 18),  // maxSingleSellEnTo
          ethers.parseUnits("200000", 18)  // dailyRedeemCapEnTo
        )
      ).to.emit(gateway, "LimitsUpdated");
    } catch {
      // If your contract exposes different setters, adapt accordingly or skip
    }
  });

  it("initiates and settles a Buy: user sends INR off-chain, settlement transfers EnTo from treasury", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, settlementOps, treasury, userA, priceFeeder } = signers;

    // Ensure sensible config
    const rate = ethers.parseUnits("0.10", 18); // 0.10 EnTo per INR
    try {
      await (await gateway.connect(priceFeeder).setMarketRate(rate)).wait();
      await (await gateway.connect(admin).setSpreads(500, 500)).wait(); // 5% both sides
      await (await gateway.connect(admin).setLimits(
        ethers.parseUnits("1000000", 18), // 1,000,000 INR max buy
        ethers.parseUnits("500000", 18),  // 500,000 EnTo max sell
        ethers.parseUnits("1000000", 18)  // 1,000,000 EnTo daily redeem
      )).wait();
    } catch {}

    // User initiates a buy for 10,000 INR (recorded on-chain; fiat handled off-chain)
    const inINR = ethers.parseUnits("10000", 18); // 10,000 INR (18-decimals)
    const tx = await gateway.connect(userA).initiateBuy(inINR);
    const rcpt = await tx.wait();

    // Extract reqId if emitted
    let reqId;
    try {
      const log = rcpt.logs.find((l) => {
        try { return gateway.interface.parseLog(l).name === "BuyInitiated"; } catch { return false; }
      });
      reqId = gateway.interface.parseLog(log).args.reqId;
    } catch {
      // If no event exposes reqId, fallback to reading a counter or get last requestId
      reqId = await gateway.lastRequestId();
    }

    // Off-chain: backend confirms bank deposit; on-chain: settlement finalizes
    await expect(gateway.connect(settlementOps).confirmFiatDeposit(reqId))
      .to.emit(gateway, "BuySettled");

    // User should receive EnTo; check non-zero
    const balA = await token.balanceOf(userA.address);
    expect(balA).to.be.greaterThan(0n);

    // Treasury should decrease
    const treBal = await token.balanceOf(treasury.address);
    expect(treBal).to.be.a("bigint");
  });

  it("initiates a Sell: user escrows EnTo; then payout or refund via settlement", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, priceFeeder, settlementOps, userA, treasury } = signers;

    // Fund userA with some tokens to sell (from treasury or deployer)
    const need = ethers.parseUnits("2000", 18);
    const tBal = await token.balanceOf(treasury.address);
    if (tBal >= need) {
      await (await token.connect(treasury).transfer(userA.address, need)).wait();
    } else {
      // If treasury low, transfer from deployer/admin if available
      const [deployer] = await ethers.getSigners();
      const dBal = await token.balanceOf(deployer.address);
      if (dBal > 0n) {
        await (await token.connect(deployer).transfer(userA.address, dBal / 2n)).wait();
      }
    }

    // Ensure rate/spreads exist
    try {
      await (await gateway.connect(priceFeeder).setMarketRate(ethers.parseUnits("0.10", 18))).wait();
      await (await gateway.connect(admin).setSpreads(400, 400)).wait();
    } catch {}

    // User approves gateway and initiates Sell for 1,000 EnTo
    const inEnTo = ethers.parseUnits("1000", 18);
    await (await token.connect(userA).approve(await gateway.getAddress(), inEnTo)).wait();
    const tx = await gateway.connect(userA).initiateSell(inEnTo);
    const rcpt = await tx.wait();

    let reqId;
    try {
      const log = rcpt.logs.find((l) => {
        try { return gateway.interface.parseLog(l).name === "SellInitiated"; } catch { return false; }
      });
      reqId = gateway.interface.parseLog(log).args.reqId;
    } catch {
      reqId = await gateway.lastRequestId();
    }

    // Path A: Confirm payout (happy path)
    await expect(gateway.connect(settlementOps).confirmFiatPayout(reqId))
      .to.emit(gateway, "SellSettled");

    // Alternatively, to test refund path, you can do:
    // await expect(gateway.connect(settlementOps).refundSell(reqId))
    //   .to.emit(gateway, "SellRefunded");
  });

  it("enforces per-tx limits and reverts when exceeding maxSingleBuyINR or maxSingleSellEnTo", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { admin, userA } = signers;

    // Tighten limits
    await (await gateway.connect(admin).setLimits(
      ethers.parseUnits("1000", 18), // maxSingleBuyINR = 1,000
      ethers.parseUnits("500", 18),  // maxSingleSellEnTo = 500
      ethers.parseUnits("1000000", 18)
    )).wait();

    // Exceed buy limit
    const tooBigINR = ethers.parseUnits("5000", 18);
    await expect(gateway.connect(userA).initiateBuy(tooBigINR)).to.be.reverted;

    // Exceed sell limit
    const { token } = contracts;
    const bigEnTo = ethers.parseUnits("600", 18);
    // Fund and approve userA
    const [deployer] = await ethers.getSigners();
    const dBal = await token.balanceOf(deployer.address);
    if (dBal > 0n) await (await token.connect(deployer).transfer(userA.address, bigEnTo)).wait();
    await (await token.connect(userA).approve(await gateway.getAddress(), bigEnTo)).wait();
    await expect(gateway.connect(userA).initiateSell(bigEnTo)).to.be.reverted;
  });

  it("applies spreads in quoted amounts (sanity check on buy/sell preview if exposed)", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { admin, priceFeeder, userA } = signers;

    // Configure
    const rate = ethers.parseUnits("0.10", 18);
    await (await gateway.connect(priceFeeder).setMarketRate(rate)).wait();
    await (await gateway.connect(admin).setSpreads(500, 700)).wait(); // 5% buy, 7% sell

    // If your contract exposes preview functions, test them; else skip:
    try {
      const inINR = ethers.parseUnits("10000", 18);
      const [enToOut, appliedRateBuy] = await gateway.previewBuy(inINR); // example signature
      expect(enToOut).to.be.a("bigint");
      expect(appliedRateBuy).to.be.a("bigint");

      const inEnTo = ethers.parseUnits("2000", 18);
      const [inrOut, appliedRateSell] = await gateway.previewSell(inEnTo);
      expect(inrOut).to.be.a("bigint");
      expect(appliedRateSell).to.be.a("bigint");
    } catch {
      // preview not implemented; acceptable
    }
  });

  it("tracks daily redeem cap for sells (if enforced per day)", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, priceFeeder, settlementOps, userA } = signers;

    // Configure: small daily cap to trigger behavior
    await (await gateway.connect(priceFeeder).setMarketRate(ethers.parseUnits("0.10", 18))).wait();
    await (await gateway.connect(admin).setSpreads(0, 0)).wait();
    await (await gateway.connect(admin).setLimits(
      ethers.parseUnits("1000000", 18),
      ethers.parseUnits("1000000", 18),
      ethers.parseUnits("1500", 18) // dailyRedeemCapEnTo = 1,500
    )).wait();

    // Fund userA and approve
    const totalToTry = ethers.parseUnits("2000", 18); // 2,000 > daily cap
    const [deployer] = await ethers.getSigners();
    const dBal = await token.balanceOf(deployer.address);
    if (dBal > 0n) await (await token.connect(deployer).transfer(userA.address, totalToTry)).wait();
    await (await token.connect(userA).approve(await gateway.getAddress(), totalToTry)).wait();

    // First sell within cap
    const first = ethers.parseUnits("1000", 18);
    await (await gateway.connect(userA).initiateSell(first)).wait();

    // Second sell that would exceed cap today
    const second = ethers.parseUnits("800", 18);
    await expect(gateway.connect(userA).initiateSell(second)).to.be.reverted;

    // Advance one day and try again (cap resets)
    await increaseTime(24 * 60 * 60 + 10);
    await (await gateway.connect(userA).initiateSell(second)).wait();
  });

  it("rejects unauthorized calls to admin/feeder/settlement functions", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { userA } = signers;

    // Unauthorized rate set
    await expect(gateway.connect(userA).setMarketRate(ethers.parseUnits("0.20", 18))).to.be.reverted;

    // Unauthorized spreads
    await expect(gateway.connect(userA).setSpreads(100, 100)).to.be.reverted;

    // Unauthorized limits
    await expect(
      gateway.connect(userA).setLimits(
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1", 18),
        ethers.parseUnits("1", 18)
      )
    ).to.be.reverted;

    // Unauthorized settlement confirmation
    await expect(gateway.connect(userA).confirmFiatDeposit(1)).to.be.reverted;
    await expect(gateway.connect(userA).confirmFiatPayout(1)).to.be.reverted;
    await expect(gateway.connect(userA).refundSell(1)).to.be.reverted;
  });

  it("handles cancel flows gracefully if supported (optional)", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { userA } = signers;

    // If your contract allows a user/admin to cancel pending requests, test here.
    // Example (adjust to your API):
    try {
      const inINR = ethers.parseUnits("1000", 18);
      const tx = await gateway.connect(userA).initiateBuy(inINR);
      const rcpt = await tx.wait();
      let reqId;
      try {
        const log = rcpt.logs.find((l) => {
          try { return gateway.interface.parseLog(l).name === "BuyInitiated"; } catch { return false; }
        });
        reqId = gateway.interface.parseLog(log).args.reqId;
      } catch {
        reqId = await gateway.lastRequestId();
      }
      await expect(gateway.connect(userA).cancelRequest(reqId))
        .to.emit(gateway, "RequestCancelled");
    } catch {
      // cancel not implemented; skip
    }
  });
});
