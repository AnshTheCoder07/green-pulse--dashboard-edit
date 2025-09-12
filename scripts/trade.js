// scripts/trade.js
// Trade flow demo (npm + Hardhat + ethers v6) for your JS project layout.
// Covers:
// 1) Seed AMM reserves (treasury -> EnergyTrade.seedAmm) if needed
// 2) Seller lists a surplus order (listSurplus)
// 3) Buyer fills the order partially/fully (buyFromOrder) with slippage guard
// 4) AMM swaps: EnTo->kWh and kWh->EnTo
// 5) Prints order book state and reserve snapshots for dashboards
//
// Usage:
//   npx hardhat run --network localhost scripts/trade.js
//
// Prereqs:
// - Contracts deployed via scripts/deploy.js (addresses saved in deploy/deployments/<network>.json)
// - Treasury holds EnTo and has approved EnergyTrade for seedAmm (or this script will do it)
// - Sellers/buyers have some EnTo and approvals as needed
// - BondingCurveLib price is used for minPremium check; listing must be >= refPrice*(1+minPremiumBps)

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

function loadAddresses() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}. Run scripts/deploy.js first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function trySeedAmm({ token, trade, treasury, admin }, enToAmount, kWhAmount) {
  // Approve EnTo to the trade contract and seed unless already seeded
  // We simply try; if it reverts because pool already seeded, we continue.
  try {
    const tradeAddr = await trade.getAddress();
    // Treasury approves
    const allowance = await token.allowance(treasury.address, tradeAddr);
    if (allowance < enToAmount) {
      await (await token.connect(treasury).approve(tradeAddr, ethers.MaxUint256)).wait();
      console.log("Treasury approved EnergyTrade for AMM seed.");
    }
    await (await trade.connect(admin).seedAmm(enToAmount, kWhAmount)).wait();
    console.log(`AMM seeded: ${ethers.formatUnits(enToAmount, 18)} EnTo, ${kWhAmount.toString()} kWh`);
  } catch (e) {
    console.log("Skipping seedAmm (likely already seeded or insufficient balance).");
  }
}

async function printOrder(trade, id) {
  const o = await trade.orderBook(id);
  console.log(`Order #${id}`, {
    seller: o.seller,
    kWhRemaining: o.kWhRemaining.toString(),
    price18: o.price18.toString(),
    active: o.active,
  });
}

async function main() {
  const addrs = loadAddresses();
  const A = addrs.addresses;
  const R = addrs.roles || {};

  const [deployer, admin, treasury, seller, buyer] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);
  console.log(`Seller: ${seller.address}`);
  console.log(`Buyer: ${buyer.address}`);

  // Contracts
  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const trade = await ethers.getContractAt("EnergyTrade", A.EnergyTrade);

  // Read minPremium and preview reference price
  const minPremiumBps = await trade.minPremiumBps();
  const refPrice18 = await trade.previewRefPrice18(); // kWh per EnTo (1e18)
  console.log("minPremiumBps:", Number(minPremiumBps));
  console.log("refPrice18 (kWh per EnTo, 1e18):", refPrice18.toString());

  // 1) Seed AMM (optional; demo values)
  const seedEnTo = ethers.parseUnits("3000", 18); // 3,000 EnTo
  const seedKwh = 30_000n;                        // 30,000 kWh (virtual)
  await trySeedAmm({ token, trade, treasury, admin }, seedEnTo, seedKwh);

  // 2) Seller lists a surplus order
  // Listing price must be >= refPrice * (1 + minPremiumBps)
  const minPrice18 = (refPrice18 * (10_000n + BigInt(minPremiumBps))) / 10_000n;
  // Choose a small premium above min (e.g., +50 bps)
  const price18 = (minPrice18 * 10_050n) / 10_000n;

  const kWhToSell = 2_500n; // seller lists 2,500 kWh
  const listTx = await trade.connect(seller).listSurplus(kWhToSell, price18);
  const listRcpt = await listTx.wait();

  // Extract orderId from OrderListed event
  const listedEvt = listRcpt.logs.find((l) => {
    try {
      const parsed = trade.interface.parseLog(l);
      return parsed && parsed.name === "OrderListed";
    } catch (_) {
      return false;
    }
  });
  if (!listedEvt) throw new Error("OrderListed event not found");
  const listedArgs = trade.interface.parseLog(listedEvt).args;
  const orderId = listedArgs.orderId;
  console.log(`Listed orderId=${orderId.toString()} at price18=${price18.toString()} for kWh=${kWhToSell.toString()}`);

  // 3) Buyer fills from order partially
  // EnTo needed = kWh * 1e18 / price18
  const kWhWanted = 1_200n; // partial fill
  const enToNeeded = (kWhWanted * 10n ** 18n) / price18;
  console.log("Buyer partial fill kWh:", kWhWanted.toString(), "-> EnTo needed:", enToNeeded.toString());

  // Ensure buyer has enough EnTo
  const buyerBal = await token.balanceOf(buyer.address);
  if (buyerBal < enToNeeded) {
    const topUp = enToNeeded - buyerBal;
    const from = (await token.balanceOf(admin.address)) >= topUp ? admin : deployer;
    await (await token.connect(from).transfer(buyer.address, topUp)).wait();
    console.log(`Funded buyer with ${ethers.formatUnits(topUp, 18)} EnTo`);
  }

  // Approve payment and fill
  await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded)).wait();
  await (await trade.connect(buyer).buyFromOrder(orderId, kWhWanted, enToNeeded)).wait();
  console.log("Buyer filled order partially.");

  // Print order state after partial fill
  await printOrder(trade, orderId);

  // 4) Buyer fills remainder (full close)
  const order = await trade.orderBook(orderId);
  const remainingKwh = order.kWhRemaining;
  if (remainingKwh > 0n) {
    const enToNeeded2 = (remainingKwh * 10n ** 18n) / price18;

    // Ensure buyer has enough for remainder
    const bal2 = await token.balanceOf(buyer.address);
    if (bal2 < enToNeeded2) {
      const topUp2 = enToNeeded2 - bal2;
      const from2 = (await token.balanceOf(admin.address)) >= topUp2 ? admin : deployer;
      await (await token.connect(from2).transfer(buyer.address, topUp2)).wait();
      console.log(`Refilled buyer with ${ethers.formatUnits(topUp2, 18)} EnTo`);
    }

    await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded2)).wait();
    await (await trade.connect(buyer).buyFromOrder(orderId, remainingKwh, enToNeeded2)).wait();
    console.log("Buyer filled the remaining order amount.");
  }

  // Confirm order inactive
  await printOrder(trade, orderId);

  // 5) AMM swaps demo
  // 5a) EnTo -> kWh
  const enToIn = ethers.parseUnits("250", 18);
  // Ensure buyer has enToIn
  const bal3 = await token.balanceOf(buyer.address);
  if (bal3 < enToIn) {
    const topUp3 = enToIn - bal3;
    const from3 = (await token.balanceOf(admin.address)) >= topUp3 ? admin : deployer;
    await (await token.connect(from3).transfer(buyer.address, topUp3)).wait();
  }
  // Preview quote to estimate minKwhOut (no fee in preview)
  const kOutPreview = await trade.previewAmmEnToForKwh(enToIn);
  const minKwhOut = (kOutPreview * 99n) / 100n; // 1% slippage tolerance
  await (await trade.connect(buyer).ammSwapEnToForKwh(enToIn, minKwhOut)).wait();
  console.log(`AMM: Buyer swapped ${ethers.formatUnits(enToIn, 18)} EnTo for >=${minKwhOut.toString()} kWh`);

  // 5b) kWh -> EnTo (seller or any user)
  const kWhIn = 1_000n;
  const enToOutPreview = await trade.previewAmmKwhForEnTo(kWhIn);
  const minEnToOut = (enToOutPreview * 99n) / 100n; // 1% slippage tolerance
  // No approval needed for kWh (virtual), the pool accounts are internal to contract.
  await (await trade.connect(seller).ammSwapKwhForEnTo(kWhIn, minEnToOut)).wait();
  console.log(`AMM: Seller swapped ${kWhIn.toString()} kWh for >=${ethers.formatUnits(minEnToOut, 18)} EnTo`);

  // 6) Print a compact snapshot for dashboards
  const snapshot = {
    network: network.name,
    addresses: A,
    order: {
      id: orderId.toString(),
      price18: price18.toString(),
      listedKWh: kWhToSell.toString(),
    },
    amm: {
      enToSwapIn: enToIn.toString(),
      kWhSwapIn: kWhIn.toString(),
    },
    ts: Date.now(),
  };

  const outDir = path.join(__dirname, "..", "data", "seed");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `trade_${network.name}_${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
  console.log(`Saved trade snapshot to ${outFile}`);

  console.log("Trade demo complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
