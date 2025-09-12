// test/fixtures/deployFixture.js
const { ethers } = require("hardhat");

// Helpers
async function tryGrantRole(contract, roleName, grantee, admin) {
  try {
    const role = await contract[roleName]();
    const has = await contract.hasRole(role, grantee);
    if (!has) {
      await (await contract.connect(admin).grantRole(role, grantee)).wait();
    }
    return true;
  } catch {
    return false;
  }
}

async function trySet(contract, fnName, args, signer) {
  try {
    await (await contract.connect(signer)[fnName](...args)).wait();
    return true;
  } catch {
    return false;
  }
}

async function approveMax(token, owner, spender) {
  try {
    await (await token.connect(owner).approve(spender, ethers.MaxUint256)).wait();
    return true;
  } catch {
    return false;
  }
}

async function deployFixture() {
  // Signers
  const [
    deployer,
    admin,
    treasury,
    oracleCommittee,
    priceFeeder,
    settlement,
    executor,
    deptA,
    deptB,
    meterFeeder,
    borrower,
    seller,
    buyer,
    extra
  ] = await ethers.getSigners();

  // Params (adjust if your tests need different defaults)
  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);       // 100,000 EnTo
  const INITIAL_RATE_EN_TO_PER_INR_18 = ethers.parseUnits("0.10", 18); // 0.10 EnTo per 1 INR

  // 1) Deploy Token
  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();

  // 2) Deploy Auction: EnergyAuction(token, genesisSupply, admin, oracleCommittee)
  const Auction = await ethers.getContractFactory("EnergyAuction");
  const auction = await Auction.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();

  // 3) Deploy Oracle: EnergyOracle(token, auction, genesisSupply, admin)
  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();

  // 4) Deploy Trade: EnergyTrade(token, genesisSupply, admin, treasury)
  const Trade = await ethers.getContractFactory("EnergyTrade");
  const trade = await Trade.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();

  // 5) Deploy Loan: EnergyLoan(token, admin, treasury)
  const Loan = await ethers.getContractFactory("EnergyLoan");
  const loan = await Loan.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();

  // 6) Deploy Gateway: FiatGateway(token, admin, treasury, initialRate)
  const Gateway = await ethers.getContractFactory("FiatGateway");
  const gateway = await Gateway.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address,
    INITIAL_RATE_EN_TO_PER_INR_18
  );
  await gateway.waitForDeployment();

  // 7) Deploy Gov: GovStaking(token, admin, executor)
  const Gov = await ethers.getContractFactory("GovStaking");
  const gov = await Gov.deploy(
    await token.getAddress(),
    admin.address,
    executor.address
  );
  await gov.waitForDeployment();

  // ---------------------- Role Wiring and Approvals ----------------------

  // Token roles for Oracle (if AccessControl is present)
  await tryGrantRole(token, "MINTER_ROLE", await oracle.getAddress(), admin);
  await tryGrantRole(token, "BURNER_ROLE", await oracle.getAddress(), admin);

  // Oracle <-> Loan linkage (if present)
  await trySet(oracle, "setLoanModule", [await loan.getAddress()], admin);
  await trySet(loan, "setOracle", [await oracle.getAddress()], admin);

  // Oracle feeder and meter signer (for tests)
  await tryGrantRole(oracle, "ORACLE_ROLE", oracleCommittee.address, admin);
  // meterFeeder can be same as oracleCommittee or a separate one
  await trySet(oracle, "setMeterSigner", [meterFeeder.address, true], admin);

  // Gateway roles (if AccessControl present)
  await tryGrantRole(gateway, "PRICE_FEEDER", priceFeeder.address, admin);
  await tryGrantRole(gateway, "SETTLEMENT_ROLE", settlement.address, admin);

  // Treasury approvals
  await approveMax(token, treasury, await gateway.getAddress()); // Gateway pulls on buy settlement
  await approveMax(token, treasury, await trade.getAddress());   // Trade seeding uses treasury liquidity
  await approveMax(token, treasury, await loan.getAddress());    // Loan may pull from treasury depending on design

  // Seed balances from deployer to treasury for demos/tests
  // Assumes EnergyToken minted some initial supply to deployer. If not, this is a no-op.
  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {
    // leave some for other test funding, move a portion to treasury
    const toTreasury = depBal / 2n;
    if (toTreasury > 0n) {
      await (await token.connect(deployer).transfer(treasury.address, toTreasury)).wait();
    }
  }

  // Handy funding utility for tests
  async function fund(address, amount) {
    const bal = await token.balanceOf(address);
    if (bal < amount) {
      const shortfall = amount - bal;
      // Try from deployer first; if insufficient, from treasury
      const dep = await token.balanceOf(deployer.address);
      if (dep >= shortfall) {
        await (await token.connect(deployer).transfer(address, shortfall)).wait();
      } else {
        const tre = await token.balanceOf(treasury.address);
        if (tre >= shortfall) {
          await (await token.connect(treasury).transfer(address, shortfall)).wait();
        } else if (tre > 0n) {
          await (await token.connect(treasury).transfer(address, tre)).wait();
        }
      }
    }
  }

  // Optionally set some default Gateway config (non-critical for most tests)
  await trySet(gateway, "setMarketRate", [INITIAL_RATE_EN_TO_PER_INR_18], priceFeeder);
  await trySet(gateway, "setSpreads", [500, 500], admin); // 5% buy/sell
  await trySet(
    gateway,
    "setLimits",
    [
      ethers.parseUnits("1000000", 18), // maxSingleBuyINR
      ethers.parseUnits("500000", 18),  // maxSingleSellEnTo
      ethers.parseUnits("1000000", 18)  // dailyRedeemCapEnTo
    ],
    admin
  );

  // Optional: Seed AMM to make previewRefPrice valid for trade tests
  async function seedTradeAmm(enToAmount, kWhAmount) {
    await fund(treasury.address, enToAmount);
    await approveMax(token, treasury, await trade.getAddress());
    try {
      await (await trade.connect(admin).seedAmm(enToAmount, kWhAmount)).wait();
    } catch {
      // already seeded or restricted; ignore
    }
  }

  // Optional: Quick helper to compute EnTo for kWh given a 1e18 kWh/EnTo price
  function enToForKwh(kWh, unitPrice18) {
    return (kWh * 10n ** 18n) / unitPrice18;
  }

  return {
    // Signers
    signers: {
      deployer,
      admin,
      treasury,
      oracleCommittee,
      priceFeeder,
      settlement,
      executor,
      deptA,
      deptB,
      meterFeeder,
      borrower,
      seller,
      buyer,
      extra
    },
    // Params
    params: {
      GENESIS_SUPPLY,
      INITIAL_RATE_EN_TO_PER_INR_18
    },
    // Contracts
    contracts: {
      token,
      auction,
      oracle,
      trade,
      loan,
      gateway,
      gov
    },
    // Utilities
    utils: {
      tryGrantRole,
      trySet,
      approveMax,
      fund,
      seedTradeAmm,
      enToForKwh
    }
  };
}

module.exports = { deployFixture };
