// scripts/loan.js
// End-to-end loan demo script (npm + Hardhat + ethers v6) for your JS project layout.
// Flow:
// 1) Ensure treasury approval for funding
// 2) Fund a borrower with some EnTo for collateral
// 3) Borrower approves collateral and requests a loan
// 4) Preview interest, check health, deposit/withdraw collateral
// 5) Repay partially, then fully
// 6) Demonstrate liquidation when undercollateralized (optional, local only)
//
// Usage:
//   npx hardhat run --network localhost scripts/loan.js
//
// Prereqs:
// - Contracts deployed via scripts/deploy.js (addresses saved in deploy/deployments/<network>.json)
// - Oracle set on Loan (done in deploy.js) and Oracle has some credit scores (defaults to 0 if not set)
// - Treasury holds EnTo and has approved the Loan contract to transfer for funding (deploy.js can do this, else see TODOs)
// - Borrower account exists (from Hardhat signers)

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function loadAddresses() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}. Run scripts/deploy.js first.`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json;
}

async function tryIncreaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {
    // Ignored on non-local networks
  }
}

async function main() {
  const addrs = await loadAddresses();
  const A = addrs.addresses;

  const [deployer, admin, treasury, borrower, extra] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);
  console.log(`Borrower: ${borrower.address}`);

  // Contracts
  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const loan = await ethers.getContractAt("EnergyLoan", A.EnergyLoan);
  const oracle = await ethers.getContractAt("EnergyOracle", A.EnergyOracle);

  // Parameters
  const collateralAmt = ethers.parseUnits("2000", 18);  // 2,000 EnTo as collateral
  const borrowAmt = ethers.parseUnits("3000", 18);      // Request to borrow 3,000 EnTo
  const partialRepay = ethers.parseUnits("1000", 18);   // Partial repayment

  // Ensure treasury approved the loan contract to fund borrowers
  // If not already approved in deploy.js, uncomment:
  // await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
  // console.log("Treasury approved Loan contract for funding.");

  // Ensure borrower has some EnTo to post as collateral
  const borrowerBal = await token.balanceOf(borrower.address);
  if (borrowerBal < collateralAmt) {
    // Transfer from admin or deployer if they hold tokens
    const from = (await token.balanceOf(admin.address)) >= collateralAmt ? admin : deployer;
    console.log(`Funding borrower with collateral from ${from.address}`);
    await (await token.connect(from).transfer(borrower.address, collateralAmt)).wait();
  }

  // Optional: set a credit score so borrower is eligible (if your Oracle uses a gate)
  // By default, MIN_CREDIT_SCORE=40 in EnergyLoan. If zero, set to 60 for demo:
  const cs = await oracle.creditScore(borrower.address).catch(() => 0n);
  if (!cs || cs === 0n) {
    // Admin sets it (EnergyOracle ADMIN_ROLE required; deploy.js gave admin that role)
    await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
    console.log("Set borrower credit score to 60 via Oracle.");
  }

  // Borrower approves Loan to pull collateral
  await (await token.connect(borrower).approve(await loan.getAddress(), collateralAmt)).wait();
  console.log("Borrower approved Loan contract to pull collateral.");

  // Request a loan
  // requestLoan(amountEnTo, collateralEnTo)
  await (await loan.connect(borrower).requestLoan(borrowAmt, collateralAmt)).wait();
  console.log(`Loan requested: ${ethers.formatUnits(borrowAmt, 18)} EnTo with ${ethers.formatUnits(collateralAmt, 18)} collateral.`);

  // Inspect loan state
  let L = await loan.loans(borrower.address);
  console.log("Loan state after funding:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });

  // Preview accrued interest after some time
  await tryIncreaseTime(7 * 24 * 60 * 60); // +7 days (local)
  const interestPreview = await loan.previewAccruedInterest(borrower.address);
  console.log("Preview interest after ~7 days:", ethers.formatUnits(interestPreview, 18));

  // Deposit more collateral (optional)
  const extraColl = ethers.parseUnits("500", 18);
  // Give borrower extra EnTo if needed
  if ((await token.balanceOf(borrower.address)) < extraColl) {
    const from = (await token.balanceOf(admin.address)) >= extraColl ? admin : deployer;
    await (await token.connect(from).transfer(borrower.address, extraColl)).wait();
  }
  await (await token.connect(borrower).approve(await loan.getAddress(), extraColl)).wait();
  await (await loan.connect(borrower).depositCollateral(extraColl)).wait();
  console.log(`Deposited extra collateral: ${ethers.formatUnits(extraColl, 18)}`);

  // Withdraw part of collateral (will revert if health would drop below thresholds)
  try {
    const withdrawAmt = ethers.parseUnits("300", 18);
    await (await loan.connect(borrower).withdrawCollateral(withdrawAmt)).wait();
    console.log(`Withdrew collateral: ${ethers.formatUnits(withdrawAmt, 18)}`);
  } catch (e) {
    console.log("Collateral withdraw blocked by health checks (as expected if unsafe).");
  }

  // Partial repayment
  // Borrower needs EnTo to repay (they received principal in their wallet when loan funded)
  await (await token.connect(borrower).approve(await loan.getAddress(), partialRepay)).wait();
  await (await loan.connect(borrower).repay(partialRepay)).wait();
  console.log(`Partial repayment: ${ethers.formatUnits(partialRepay, 18)}`);

  // Check state again
  L = await loan.loans(borrower.address);
  console.log("Loan state after partial repay:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });

  // Final repay (attempt to clear everything)
  const principalNow = L.principal;
  if (principalNow > 0n) {
    // Ensure borrower has enough EnTo to fully repay
    const needed = principalNow;
    const bal = await token.balanceOf(borrower.address);
    if (bal < needed) {
      const topUp = needed - bal;
      const from = (await token.balanceOf(admin.address)) >= topUp ? admin : deployer;
      await (await token.connect(from).transfer(borrower.address, topUp)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), needed)).wait();
    await (await loan.connect(borrower).repay(needed)).wait();
    console.log(`Fully repaid: ${ethers.formatUnits(needed, 18)} EnTo`);
  }

  // Check state after full repay
  L = await loan.loans(borrower.address);
  console.log("Loan state after full repay:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });

  // Optional: Demonstrate liquidation (LOCAL ONLY)
  // To show liquidation, you would need an undercollateralized state:
  // - Borrow more relative to collateral; or
  // - Manually modify risk params to make threshold stricter; or
  // - Simulate interest growth that pushes principal high enough.
  // Example (commented out):
  //
  // await (await oracle.connect(admin).setCreditScore(borrower.address, 45)).wait(); // small effect on rate
  // await tryIncreaseTime(365 * 24 * 60 * 60); // +1 year
  // try {
  //   await (await loan.connect(deployer).liquidate(borrower.address)).wait();
  //   console.log("Liquidation executed (borrower under threshold).");
  // } catch (e) {
  //   console.log("Liquidation not eligible (health still above threshold).");
  // }

  console.log("Loan demo complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
