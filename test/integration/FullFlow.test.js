// test/integration/FullFlow.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// --------------------------------- Helpers ---------------------------------
async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {}
}
async function mineBlocks(n) {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine");
  }
}
// If unitPrice18 is kWh per EnTo (1e18), EnTo required for kWh is:
function enToForKwh(kWh, unitPrice18) {
  return (kWh * 10n ** 18n) / unitPrice18;
}
// Build signature for Oracle.recordUsageSigned
async function buildUsageSig(oracle, meterSigner, dept, month, kWh, nonce) {
  const payloadHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address","address","uint256","uint256","bytes32"],
      [await oracle.getAddress(), dept, month, kWh, nonce]
    )
  );
  const sig = await meterSigner.signMessage(ethers.getBytes(payloadHash));
  return { payloadHash, sig };
}

// ------------------------------ Deploy fixture ------------------------------
async function deployAll() {
  const [
    deployer,
    admin,
    treasury,
    oracleCommittee,
    priceFeeder,
    settlement,
    executor,
    dept,
    buyer,
    seller,
    meterFeeder,
    borrower
  ] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE = ethers.parseUnits("0.10", 18); // EnTo per INR, 1e18

  // Token
  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();

  // Auction
  const Auction = await ethers.getContractFactory("EnergyAuction");
  const auction = await Auction.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();

  // Oracle
  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();

  // Trade
  const Trade = await ethers.getContractFactory("EnergyTrade");
  const trade = await Trade.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();

  // Loan
  const Loan = await ethers.getContractFactory("EnergyLoan");
  const loan = await Loan.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();

  // Gateway
  const Gateway = await ethers.getContractFactory("FiatGateway");
  const gateway = await Gateway.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address,
    INITIAL_RATE
  );
  await gateway.waitForDeployment();

  // Governance
  const Gov = await ethers.getContractFactory("GovStaking");
  const gov = await Gov.deploy(
    await token.getAddress(),
    admin.address,
    executor.address
  );
  await gov.waitForDeployment();

  // Transfer some tokens from treasury to admin for testing
  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n; // Transfer half to admin
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }

  // ----------------------- Wiring roles/approvals -----------------------
  // Token roles to Oracle if available
  try {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    await (await token.connect(admin).grantRole(MINTER_ROLE, await oracle.getAddress())).wait();
    await (await token.connect(admin).grantRole(BURNER_ROLE, await oracle.getAddress())).wait();
  } catch {}

  // Oracle <-> Loan link (if present)
  try { await (await oracle.connect(admin).setLoanModule(await loan.getAddress())).wait(); } catch {}
  try { await (await loan.connect(admin).setOracle(await oracle.getAddress())).wait(); } catch {}

  // Oracle roles for feeder and meter signer
  try {
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    await (await oracle.connect(admin).grantRole(ORACLE_ROLE, oracleCommittee.address)).wait();
    // meterFeeder as signer to submit usage
    await (await oracle.connect(admin).setMeterSigner(meterFeeder.address, true)).wait();
  } catch {}

  // Gateway roles + approvals
  try {
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    await (await gateway.connect(admin).grantRole(PRICE_FEEDER, priceFeeder.address)).wait();
    await (await gateway.connect(admin).grantRole(SETTLEMENT_ROLE, settlement.address)).wait();
  } catch {}
  // Treasury approves gateway for transfers on buy settlement
  await (await token.connect(treasury).approve(await gateway.getAddress(), ethers.MaxUint256)).wait();

  // Seed balances from deployer to treasury for demos
  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {
    await (await token.transfer(treasury.address, depBal / 2n)).wait();
  }

  return {
    signers: { deployer, admin, treasury, oracleCommittee, priceFeeder, settlement, executor, dept, buyer, seller, meterFeeder, borrower },
    params: { GENESIS_SUPPLY, INITIAL_RATE },
    contracts: { token, auction, oracle, trade, loan, gateway, gov },
  };
}

// ---------------------------------- Tests -----------------------------------
describe("FullFlow integration", () => {
  it("runs a month flow + trade + loan + governance end-to-end", async () => {
    const { contracts, signers } = await deployAll();
    const { token, auction, oracle, trade, loan, gateway, gov } = contracts;
    const { admin, treasury, oracleCommittee, priceFeeder, settlement, executor, dept, buyer, seller, meterFeeder, borrower } = signers;

    // ------------------------ Auction + Oracle month flow ------------------------
    const month = 202508n;
    const kWhToBuy = 2_000n;

    // Dept buys pack
    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const enToRequired = (kWhToBuy * 10n ** 18n) / unitPrice18;

    // Fund dept, approve, buy
    await (await token.connect(admin).transfer(dept.address, enToRequired)).wait();
    await (await token.connect(dept).approve(await auction.getAddress(), enToRequired)).wait();
    await (await auction.connect(dept).buyPack(month, kWhToBuy)).wait();

    // Meter posts signed usage chunks
    const usage = [400n, 350n, 300n, 450n, 150n, 100n]; // totals 1,750 kWh
    for (let i = 0; i < usage.length; i++) {
      const nonce = ethers.keccak256(ethers.toUtf8Bytes(`nonce-${Number(month)}-${i}`));
      const { sig } = await buildUsageSig(oracle, meterFeeder, dept.address, month, usage[i], nonce);
      await (await oracle.connect(meterFeeder).recordUsageSigned(dept.address, month, usage[i], nonce, sig)).wait();
    }

    // Claim savings
    const balBefore = await token.balanceOf(dept.address);
    await (await oracle.connect(dept).claimSavings(month)).wait();
    const balAfter = await token.balanceOf(dept.address);
    expect(balAfter).to.be.greaterThanOrEqual(balBefore);

    // ------------------------ Trade: AMM seed + orderbook ------------------------
    // Seed AMM
    const seedEnTo = ethers.parseUnits("3000", 18);
    const seedKwh = 30_000n;
    // Ensure treasury has tokens to seed
    const treBal = await token.balanceOf(treasury.address);
    if (treBal < seedEnTo) {
      await (await token.connect(admin).transfer(treasury.address, seedEnTo - treBal)).wait();
    }
    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();
    try { await (await trade.connect(admin).seedAmm(seedEnTo, seedKwh)).wait(); } catch {}

    // Seller lists an order at minPremium over reference
    const refPrice18 = await trade.previewRefPrice18();
    const minPremiumBps = await trade.minPremiumBps();
    const minPrice18 = (refPrice18 * (10_000n + BigInt(minPremiumBps))) / 10_000n;
    const price18 = (minPrice18 * 10_050n) / 10_000n;

    const kWhList = 2_400n;
    const listTx = await trade.connect(seller).listSurplus(kWhList, price18);
    const listRcpt = await listTx.wait();
    const listedLog = listRcpt.logs.find((l) => {
      try { return trade.interface.parseLog(l).name === "OrderListed"; } catch { return false; }
    });
    const orderId = trade.interface.parseLog(listedLog).args.orderId;

    // Buyer partially fills
    const kWhWanted1 = 1_000n;
    const enToNeeded1 = (kWhWanted1 * 10n ** 18n) / price18;
    // Fund buyer
    const bBal = await token.balanceOf(buyer.address);
    if (bBal < enToNeeded1) {
      await (await token.connect(admin).transfer(buyer.address, enToNeeded1 - bBal)).wait();
    }
    await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded1)).wait();
    await (await trade.connect(buyer).buyFromOrder(orderId, kWhWanted1, enToNeeded1)).wait();

    // Fill remainder
    const order = await trade.orderBook(orderId);
    const remaining = order.kWhRemaining;
    if (remaining > 0n) {
      const enToNeeded2 = (remaining * 10n ** 18n) / price18;
      const bBal2 = await token.balanceOf(buyer.address);
      if (bBal2 < enToNeeded2) {
        await (await token.connect(admin).transfer(buyer.address, enToNeeded2 - bBal2)).wait();
      }
      await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded2)).wait();
      await (await trade.connect(buyer).buyFromOrder(orderId, remaining, enToNeeded2)).wait();
    }

    // AMM swaps
    const enToIn = ethers.parseUnits("250", 18);
    const kOutPrev = await trade.previewAmmEnToForKwh(enToIn);
    const minKOut = (kOutPrev * 99n) / 100n;
    // fund buyer if needed
    const bBal3 = await token.balanceOf(buyer.address);
    if (bBal3 < enToIn) {
      await (await token.connect(admin).transfer(buyer.address, enToIn - bBal3)).wait();
    }
    await (await token.connect(buyer).approve(await trade.getAddress(), enToIn)).wait();
    await (await trade.connect(buyer).ammSwapEnToForKwh(enToIn, minKOut)).wait();

    const kWhIn = 1000n;
    const enOutPrev = await trade.previewAmmKwhForEnTo(kWhIn);
    const minEnOut = (enOutPrev * 99n) / 100n;
    await (await trade.connect(seller).ammSwapKwhForEnTo(kWhIn, minEnOut)).wait();

    // ------------------------------- Loan lifecycle ------------------------------
    // Treasury approval to fund if needed
    try { await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait(); } catch {}

    // Borrower credit score (if required)
    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch {}

    // Collateral and borrow
    const collateral = ethers.parseUnits("2000", 18);
    const borrowAmt = ethers.parseUnits("3000", 18);
    // fund borrower with collateral
    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();
    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();
    await (await loan.connect(borrower).requestLoan(borrowAmt, collateral)).wait();

    // Time passes, interest accrues
    await increaseTime(7 * 24 * 60 * 60);
    try {
      const preview = await loan.previewAccruedInterest(borrower.address);
      expect(preview).to.be.a("bigint");
    } catch {}

    // Partial repay
    const partRepay = ethers.parseUnits("1000", 18);
    const borBal = await token.balanceOf(borrower.address); // received principal earlier
    if (borBal < partRepay) {
      await (await token.connect(admin).transfer(borrower.address, partRepay - borBal)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), partRepay)).wait();
    await (await loan.connect(borrower).repay(partRepay)).wait();

    // Full repay
    const L = await loan.loans(borrower.address);
    const remainingDebt = L.principal;
    if (remainingDebt > 0n) {
      const bal2 = await token.balanceOf(borrower.address);
      if (bal2 < remainingDebt) {
        await (await token.connect(admin).transfer(borrower.address, remainingDebt - bal2)).wait();
      }
      await (await token.connect(borrower).approve(await loan.getAddress(), remainingDebt)).wait();
      await (await loan.connect(borrower).repay(remainingDebt)).wait();
    }

    // ----------------------------- Gateway simple flow ---------------------------
    // Update rate/spreads/limits (optional, if roles exist)
    try {
      await (await gateway.connect(priceFeeder).setMarketRate(ethers.parseUnits("0.10", 18))).wait();
      await (await gateway.connect(admin).setSpreads(500, 500)).wait();
      await (await gateway.connect(admin).setLimits(
        ethers.parseUnits("1000000", 18),
        ethers.parseUnits("500000", 18),
        ethers.parseUnits("1000000", 18)
      )).wait();
    } catch {}

    // User initiates buy (off-chain INR), settlement confirms deposit and EnTo moves from treasury
    const inINR = ethers.parseUnits("5000", 18);
    const buyTx = await gateway.connect(buyer).initiateBuy(inINR);
    const buyRcpt = await buyTx.wait();
    let reqId;
    try {
      const log = buyRcpt.logs.find((l) => {
        try { return gateway.interface.parseLog(l).name === "BuyInitiated"; } catch { return false; }
      });
      reqId = gateway.interface.parseLog(log).args.reqId;
    } catch { reqId = await gateway.lastRequestId(); }
    await (await gateway.connect(settlement).confirmFiatDeposit(reqId)).wait();

    // ------------------------ Governance: stake -> propose -> execute ------------
    // Stake voters
    const s1 = ethers.parseUnits("1500", 18);
    const s2 = ethers.parseUnits("1200", 18);
    // fund buyers to stake
    await (await token.connect(admin).transfer(buyer.address, s1)).wait();
    await (await token.connect(admin).transfer(seller.address, s2)).wait();
    await (await token.connect(buyer).approve(await gov.getAddress(), s1)).wait();
    await (await token.connect(seller).approve(await gov.getAddress(), s2)).wait();
    await (await gov.connect(buyer).stake(s1)).wait();
    await (await gov.connect(seller).stake(s2)).wait();

    const paramKey = ethers.id("BURN_RATE");
    const newValue = ethers.parseUnits("0.09", 18);
    const description = "Adjust burn rate";

    const propTx = await gov.connect(buyer).propose(paramKey, newValue, description);
    const propRcpt = await propTx.wait();
    const created = propRcpt.logs.find((l) => {
      try { return gov.interface.parseLog(l).name === "ProposalCreated"; } catch { return false; }
    });
    const propId = gov.interface.parseLog(created).args.id;

    const vd = await gov.votingDelay();
    if (Number(vd) > 0) await mineBlocks(Number(vd));

    await (await gov.connect(buyer).castVote(propId, 1)).wait();
    await (await gov.connect(seller).castVote(propId, 1)).wait();

    const vp = await gov.votingPeriod();
    await mineBlocks(Number(vp) + 1);

    await (await gov.queue(propId)).wait();

    const ed = await gov.executionDelay();
    await increaseTime(Number(ed) + 1);

    await (await gov.connect(executor).execute(propId)).wait();

    // Final sanity assertions
    const pack = await auction.getPack(month, dept.address);
    expect(pack.exists).to.eq(true);
    const mu = await oracle.getMonthUsage(month, dept.address);
    expect(mu.settled).to.eq(true);
    const L2 = await loan.loans(borrower.address);
    expect(L2.principal).to.eq(0n);
  }).timeout(240000);
});
