// scripts/deploy.js
// One-shot deployment for the EnergyToken stack using Hardhat + ethers (npm, JS).
// - Deploys: EnergyToken, BondingCurveLib (linked via import only), EnergyAuction, EnergyOracle,
//            EnergyTrade, EnergyLoan, FiatGateway, GovStaking
// - Wires critical roles and allowances
// - Writes addresses to deploy/deployments/<network>.json for frontend/backend
//
// Prereqs:
// - hardhat.config.js configured with networks and PRIVATE_KEY (if not localhost)
// - .env with PRIVATE_KEY_DEPLOYER and RPC URLs (optional if using HH local accounts)
// - Run: npx hardhat run --network <network> scripts/deploy.js

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();

  // Assign common actors. On localhost, Hardhat gives you many accounts; we reuse a few deterministically.
  // Adjust these assignments for your environment (or load from .env).
  const deployer = signers[0];
  const admin = signers[1] || deployer;
  const treasury = signers[2] || deployer;
  const oracleCommittee = signers[3] || admin;
  const priceFeeder = signers[4] || admin;
  const settlement = signers[5] || admin;
  const executor = signers[6] || admin;

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);
  console.log(`OracleCommittee: ${oracleCommittee.address}`);
  console.log(`PriceFeeder: ${priceFeeder.address}`);
  console.log(`Settlement: ${settlement.address}`);
  console.log(`Executor: ${executor.address}`);

  // Parameters
  // Use the same reference genesis supply across contracts that depend on BondingCurveLib and economics.
  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18); // 100,000 EnTo (example)
  const INITIAL_MARKET_RATE_EN_TO_PER_INR = ethers.parseUnits("0.10", 18); // 1 INR -> 0.10 EnTo (example)

  // 1) Deploy EnergyToken
  // EnergyToken constructor requires (admin, treasury, maxSupply)
  // Set maxSupply to 0 to disable hard cap
  const TokenFactory = await ethers.getContractFactory("EnergyToken", deployer);
  const token = await TokenFactory.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("EnergyToken:", tokenAddr);

  // 2) Deploy EnergyAuction (contracts/market/EnergyAuction.sol)
  // constructor(address token_, uint256 genesisSupply_, address admin_, address oracleCommittee_)
  const AuctionFactory = await ethers.getContractFactory("EnergyAuction", deployer);
  const auction = await AuctionFactory.deploy(
    tokenAddr,
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log("EnergyAuction:", auctionAddr);

  // 3) Deploy EnergyOracle (contracts/control/EnergyOracle.sol)
  // constructor(address token_, address auction_, uint256 genesisSupply_, address admin_)
  const OracleFactory = await ethers.getContractFactory("EnergyOracle", deployer);
  const oracle = await OracleFactory.deploy(
    tokenAddr,
    auctionAddr,
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("EnergyOracle:", oracleAddr);

  // 4) Deploy EnergyTrade (contracts/market/EnergyTrade.sol)
  // constructor(address token_, uint256 genesisSupply_, address admin_, address treasury_)
  const TradeFactory = await ethers.getContractFactory("EnergyTrade", deployer);
  const trade = await TradeFactory.deploy(
    tokenAddr,
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();
  const tradeAddr = await trade.getAddress();
  console.log("EnergyTrade:", tradeAddr);

  // 5) Deploy EnergyLoan (contracts/control/EnergyLoan.sol)
  // constructor(address token_, address admin_, address treasury_)
  const LoanFactory = await ethers.getContractFactory("EnergyLoan", deployer);
  const loan = await LoanFactory.deploy(
    tokenAddr,
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();
  const loanAddr = await loan.getAddress();
  console.log("EnergyLoan:", loanAddr);

  // 6) Deploy FiatGateway (contracts/control/FiatGateway.sol)
  // constructor(address token_, address admin_, address treasury_, uint256 initialRateEnToPerINR18)
  const GatewayFactory = await ethers.getContractFactory("FiatGateway", deployer);
  const gateway = await GatewayFactory.deploy(
    tokenAddr,
    admin.address,
    treasury.address,
    INITIAL_MARKET_RATE_EN_TO_PER_INR
  );
  await gateway.waitForDeployment();
  const gatewayAddr = await gateway.getAddress();
  console.log("FiatGateway:", gatewayAddr);

  // 7) Deploy GovStaking (contracts/control/GovStaking.sol)
  // constructor(address token_, address admin_, address executor_)
  const GovFactory = await ethers.getContractFactory("GovStaking", deployer);
  const gov = await GovFactory.deploy(
    tokenAddr,
    admin.address,
    executor.address
  );
  await gov.waitForDeployment();
  const govAddr = await gov.getAddress();
  console.log("GovStaking:", govAddr);

  // ---------------------------
  // Wire Roles and Modules
  // ---------------------------

  // EnergyToken roles for Oracle (MINTER and BURNER)
  // Note: Your EnergyToken must expose these role getters if using AccessControl as per your earlier design.
  // If not present, remove/adjust accordingly.
  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    const tx1 = await token.connect(admin).grantRole(MINTER_ROLE, oracleAddr);
    await tx1.wait();
    const tx2 = await token.connect(admin).grantRole(BURNER_ROLE, oracleAddr);
    await tx2.wait();
    console.log("Granted MINTER and BURNER roles on EnergyToken to EnergyOracle");
  } else {
    console.warn("EnergyToken roles not found (MINTER_ROLE/BURNER_ROLE). Skipping role grants.");
  }

  // Wire loan module into Oracle if you want liquidation checks
  const tx3 = await oracle.connect(admin).setLoanModule(loanAddr);
  await tx3.wait();
  console.log("Oracle linked to Loan module");

  // FiatGateway custom roles (PRICE_FEEDER and SETTLEMENT_ROLE)
  // Constructor already gave ADMIN_ROLE to admin and TREASURY_ROLE to treasury.
  if (gateway.PRICE_FEEDER && gateway.SETTLEMENT_ROLE) {
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    const tx4 = await gateway.connect(admin).grantRole(PRICE_FEEDER, priceFeeder.address);
    await tx4.wait();
    const tx5 = await gateway.connect(admin).grantRole(SETTLEMENT_ROLE, settlement.address);
    await tx5.wait();
    console.log("Granted PRICE_FEEDER and SETTLEMENT_ROLE on FiatGateway");
  } else {
    console.warn("FiatGateway role getters not found. Skipping feeder/settlement grants.");
  }

  // Loan needs Oracle address to compute credit-score-based rates
  if (loan.setOracle) {
    const tx6 = await loan.connect(admin).setOracle(oracleAddr);
    await tx6.wait();
    console.log("Loan linked to Oracle for credit scores");
  }

  // ---------------------------
  // Helpful initial approvals (optional)
  // ---------------------------

  // Treasury approves FiatGateway for unlimited EnTo transfers (to fulfill buys)
  // This is optional here; you can also run scripts/seedGateway.js later.
  try {
    const approveTx = await (await ethers.getContractAt("EnergyToken", tokenAddr, treasury))
      .approve(gatewayAddr, ethers.MaxUint256);
    await approveTx.wait();
    console.log("Treasury approved FiatGateway for EnTo transfers");
  } catch (e) {
    console.warn("Treasury approval for FiatGateway failed or skipped:", e?.message);
  }

  // ---------------------------
  // Persist deployment addresses for frontend/backend
  // ---------------------------
  const out = {
    network: network.name,
    addresses: {
      EnergyToken: tokenAddr,
      EnergyAuction: auctionAddr,
      EnergyOracle: oracleAddr,
      EnergyTrade: tradeAddr,
      EnergyLoan: loanAddr,
      FiatGateway: gatewayAddr,
      GovStaking: govAddr
    },
    roles: {
      admin: admin.address,
      treasury: treasury.address,
      oracleCommittee: oracleCommittee.address,
      priceFeeder: priceFeeder.address,
      settlement: settlement.address,
      executor: executor.address
    },
    params: {
      genesisSupply: GENESIS_SUPPLY.toString(),
      initialRateEnToPerINR18: INITIAL_MARKET_RATE_EN_TO_PER_INR.toString()
    },
    timestamp: Date.now()
  };

  const dir = path.join(__dirname, "..", "deploy", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Deployment saved to ${file}`);

  // Summary
  console.log("\nDeployed addresses:");
  console.table(out.addresses);
  console.log("Role holders:");
  console.table(out.roles);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
