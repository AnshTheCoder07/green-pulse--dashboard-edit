// scripts/simulateMonth.js
// End-to-end monthly flow demo (npm + Hardhat + ethers v6) for your JS project layout.
// Flow:
// 1) Pick a month (yyyymm) and a department account
// 2) Department acquires enough EnTo (from admin/treasury) and approves Auction
// 3) Department buys an EnergyPack from EnergyAuction
// 4) “Meter” (an authorized signer) posts signed usage to EnergyOracle over time
// 5) Department claims savings at month end
// 6) Print useful stats for your dashboard/backend
//
// Usage:
//   npx hardhat run --network localhost scripts/simulateMonth.js
//
// Prereqs:
// - Contracts deployed via scripts/deploy.js (addresses saved in deploy/deployments/<network>.json)
// - Oracle has ORACLE_ROLE granted to your “meter feeder” account and that address is set as a meter signer
//   This script grants both if running on localhost and not already set
// - Department has or receives EnTo to buy packs
// - Auction/Oracle/Token implementations match the robust versions discussed

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
  const A = addrs.addresses;
  const roles = addrs.roles || {};

  // Signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const admin = signers[1] || deployer;
  const dept = signers[2] || deployer;            // department wallet (buyer and claimant)
  const oracleCommittee = signers[3] || admin;    // used only for baselines in Auction if needed
  const meterFeeder = signers[4] || admin;        // account that calls recordUsageSigned (must have ORACLE_ROLE and be a meter signer)

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Dept: ${dept.address}`);
  console.log(`MeterFeeder: ${meterFeeder.address}`);

  // Contracts
  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const auction = await ethers.getContractAt("EnergyAuction", A.EnergyAuction);
  const oracle = await ethers.getContractAt("EnergyOracle", A.EnergyOracle);

  // Params for the simulation
  const month = 202508; // yyyymm (example)
  const kWhToBuy = 2_000n; // department buys 2,000 kWh
  const usageSamples = [400n, 350n, 300n, 450n, 200n, 250n]; // 6 readings over the month, total 1,950 kWh

  // 0) Ensure meterFeeder has ORACLE_ROLE and is authorized as a meter signer (local/demo)
  try {
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();
    const hasRole = await oracle.hasRole(ORACLE_ROLE, meterFeeder.address);
    if (!hasRole) {
      console.log("Granting ORACLE_ROLE to meterFeeder (demo)...");
      await (await oracle.connect(admin).grantRole(ORACLE_ROLE, meterFeeder.address)).wait();
    }
    console.log("Setting meterFeeder as an authorized meter signer (demo)...");
    await (await oracle.connect(admin).setMeterSigner(meterFeeder.address, true)).wait();
  } catch (e) {
    console.log("Skipping ORACLE_ROLE / meter signer setup (likely already configured).");
  }

  // 1) Department prepares EnTo and approves the Auction
  // preview price -> compute EnTo required
  const unitPrice18 = await auction.previewCurrentUnitPrice18(); // kWh per EnTo (1e18)
  // EnTo required = kWh * 1e18 / unitPrice18
  const enToRequired = (kWhToBuy * 10n ** 18n) / unitPrice18;
  console.log("Unit price (kWh/EnTo, 1e18):", unitPrice18.toString());
  console.log("EnTo required to buy pack:", enToRequired.toString());

  // ensure dept has enough EnTo (transfer from admin or deployer as needed)
  const deptBal = await token.balanceOf(dept.address);
  if (deptBal < enToRequired) {
    const needed = enToRequired - deptBal;
    const adminBal = await token.balanceOf(admin.address);
    const from = adminBal >= needed ? admin : deployer;
    console.log(`Funding dept with EnTo from ${from.address} ...`);
    await (await token.connect(from).transfer(dept.address, needed)).wait();
  }

  // approve auction
  await (await token.connect(dept).approve(await auction.getAddress(), enToRequired)).wait();

  // 2) Department buys EnergyPack
  await (await auction.connect(dept).buyPack(month, kWhToBuy)).wait();
  console.log(`Pack purchased: month=${month}, kWh=${kWhToBuy.toString()}`);

  // Show pack and monthly stats
  const pack = await auction.getPack(month, dept.address);
  console.log("Pack for dept:", {
    kWhPurchased: pack.kWhPurchased.toString(),
    enToPaid: pack.enToPaid.toString(),
    unitPrice18: pack.unitPrice18.toString(),
    exists: pack.exists
  });

  // 3) “Meter” posts signed usage throughout the month
  // recordUsageSigned(dept, month, kWh, nonce, signature)
  // signature over keccak256(abi.encodePacked(oracleAddress, dept, month, kWh, nonce))
  for (let i = 0; i < usageSamples.length; i++) {
    const kWh = usageSamples[i];
    const nonce = ethers.keccak256(ethers.toUtf8Bytes(`usage-nonce-${month}-${i}-${Date.now()}`));
    const payloadHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256", "uint256", "bytes32"],
        [await oracle.getAddress(), dept.address, month, kWh, nonce]
      )
    );
    const sig = await meterFeeder.signMessage(ethers.getBytes(payloadHash));
    await (await oracle.connect(meterFeeder).recordUsageSigned(dept.address, month, kWh, nonce, sig)).wait();
    console.log(`Usage recorded: +${kWh.toString()} kWh`);
  }

  // Show month usage state before claiming
  let monthUsage = await oracle.getMonthUsage(month, dept.address);
  console.log("MonthUsage before savings:", {
    kWhPurchased: monthUsage.kWhPurchased.toString(),
    kWhConsumed: monthUsage.kWhConsumed.toString(),
    unitPrice18: monthUsage.unitPrice18.toString(),
    settled: monthUsage.settled
  });

  // 4) Department claims savings at month end
  await (await oracle.connect(dept).claimSavings(month)).wait();
  console.log("Savings claimed.");

  // Show month usage state after claiming
  monthUsage = await oracle.getMonthUsage(month, dept.address);
  console.log("MonthUsage after savings:", {
    kWhPurchased: monthUsage.kWhPurchased.toString(),
    kWhConsumed: monthUsage.kWhConsumed.toString(),
    unitPrice18: monthUsage.unitPrice18.toString(),
    settled: monthUsage.settled
  });

  // 5) Show final EnTo balance and a few dashboard-friendly fields
  const finalDeptBal = await token.balanceOf(dept.address);
  console.log("Final dept EnTo balance:", ethers.formatUnits(finalDeptBal, 18));

  // 6) Example: dump a compact JSON snapshot for your backend/fixtures
  const snapshot = {
    network: network.name,
    month,
    dept: dept.address,
    pack: {
      kWhPurchased: pack.kWhPurchased.toString(),
      enToPaid: pack.enToPaid.toString(),
      unitPrice18: pack.unitPrice18.toString()
    },
    usage: {
      totalConsumed: monthUsage.kWhConsumed.toString(),
      settled: monthUsage.settled
    },
    balances: {
      deptEnTo: finalDeptBal.toString()
    },
    timestamps: {
      finishedAt: Date.now()
    }
  };

  const outDir = path.join(__dirname, "..", "data", "seed");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `simulateMonth_${network.name}_${month}.json`);
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
  console.log(`Saved simulation snapshot to ${outFile}`);

  console.log("simulateMonth flow complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
