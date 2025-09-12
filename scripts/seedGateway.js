// scripts/seedGateway.js
// Prepares FiatGateway for operation:
// - Treasury approves FiatGateway to transfer EnTo on its behalf (to fulfill 'buy' settlements).
// - Optionally sets market rate, spreads, and limits.
//
// Usage:
//   npx hardhat run --network localhost scripts/seedGateway.js
//
// Prereqs:
// - Contracts deployed via scripts/deploy.js (addresses saved in deploy/deployments/<network>.json)
// - Treasury signer available via Hardhat accounts (index 2 by convention in our examples)

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

async function main() {
  const addrs = loadAddresses();
  const A = addrs.addresses || {};
  const R = addrs.roles || {};

  const signers = await ethers.getSigners();
  // Convention from examples: [0]=deployer, [1]=admin, =treasury
  const deployer = signers;
  const admin = signers[1] || deployer;
  const treasury = signers || deployer;

  if (!A.EnergyToken || !A.FiatGateway) {
    throw new Error("Missing EnergyToken or FiatGateway address in deployments file.");
  }

  console.log(`Network: ${network.name}`);
  console.log(`Admin:    ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);

  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const gateway = await ethers.getContractAt("FiatGateway", A.FiatGateway);

  // 1) Treasury approves the gateway to transfer EnTo for buy settlements
  const gatewayAddr = await gateway.getAddress();
  const allowance = await token.allowance(treasury.address, gatewayAddr);
  if (allowance < ethers.parseUnits("1000000", 18)) {
    console.log("Approving FiatGateway to transfer EnTo from Treasury...");
    const txA = await token.connect(treasury).approve(gatewayAddr, ethers.MaxUint256);
    await txA.wait();
    console.log("Approved.");
  } else {
    console.log("Sufficient allowance already set. Skipping approval.");
  }

  // 2) Optional: Set initial market config (requires PRICE_FEEDER or ADMIN_ROLE where applicable)
  // Uncomment and adjust if you want to change defaults here instead of UI:
  //
  // const rate = ethers.parseUnits("0.10", 18); // 1 INR -> 0.10 EnTo
  // await (await gateway.connect(admin).setMarketRate(rate)).wait();
  // console.log("Market rate set to 0.10 EnTo/INR");
  //
  // await (await gateway.connect(admin).setSpreads(500, 500)).wait(); // 5%/5%
  // console.log("Spreads set to 5% (buy) / 5% (sell)");
  //
  // await (await gateway.connect(admin).setLimits(
  //   ethers.parseUnits("100000", 18),   // maxSingleBuyINR (interpreted as 18-decimal INR units)
  //   ethers.parseUnits("50000", 18),    // maxSingleSellEnTo
  //   ethers.parseUnits("200000", 18)    // dailyRedeemCapEnTo
  // )).wait();
  // console.log("Limits updated.");

  // 3) Quick sanity: log current config
  const rateNow = await gateway.marketRateEnToPerINR18();
  const buyBps = await gateway.buySpreadBps();
  const sellBps = await gateway.sellSpreadBps();
  const maxBuyINR = await gateway.maxSingleBuyINR();
  const maxSellEnTo = await gateway.maxSingleSellEnTo();
  const dailyCap = await gateway.dailyRedeemCapEnTo();

  console.log("FiatGateway config:", {
    marketRateEnToPerINR18: rateNow.toString(),
    buySpreadBps: Number(buyBps),
    sellSpreadBps: Number(sellBps),
    maxSingleBuyINR: maxBuyINR.toString(),
    maxSingleSellEnTo: maxSellEnTo.toString(),
    dailyRedeemCapEnTo: dailyCap.toString()
  });

  console.log("seedGateway complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
