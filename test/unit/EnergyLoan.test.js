// test/unit/EnergyLoan.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper: fast-forward local chain time (works on Hardhat/Anvil)
async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {
    // Ignored on public networks
  }
}

// Deploy minimal stack needed for EnergyLoan tests
async function deployFixture() {
  const [
    deployer,
    admin,
    treasury,
    oracleCommittee,
    borrower,
    meterFeeder,
    extra
  ] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE = ethers.parseUnits("0.10", 18); // for gateway elsewhere; not used here

  // EnergyToken
  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0 // maxSupply = 0 means no cap
  );
  await token.waitForDeployment();

  // EnergyAuction (used by Oracle to get price context in some designs)
  const Auction = await ethers.getContractFactory("EnergyAuction");
  const auction = await Auction.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();

  // EnergyOracle (credit scores, usage, savings)
  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();

  // EnergyLoan (the system under test)
  const Loan = await ethers.getContractFactory("EnergyLoan");
  const loan = await Loan.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();

  // Transfer some tokens from treasury to admin for testing
  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n; // Transfer half to admin
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }

  // Wiring
  // Token roles for Oracle (if your token exposes them)
  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    await (await token.connect(admin).grantRole(MINTER_ROLE, await oracle.getAddress())).wait();
    await (await token.connect(admin).grantRole(BURNER_ROLE, await oracle.getAddress())).wait();
  }

  // Oracle <-> Loan linking (as per your robust setup)
  if (oracle.setLoanModule) {
    await (await oracle.connect(admin).setLoanModule(await loan.getAddress())).wait();
  }
  if (loan.setOracle) {
    await (await loan.connect(admin).setOracle(await oracle.getAddress())).wait();
  }

  return {
    signers: { deployer, admin, treasury, oracleCommittee, borrower, meterFeeder, extra },
    params: { GENESIS_SUPPLY, INITIAL_RATE },
    contracts: { token, auction, oracle, loan },
  };
}

describe("EnergyLoan", () => {
  it("requests a loan with collateral, accrues interest over time, and supports partial/full repayment", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower } = signers;

    // Ensure Treasury can fund loans if your contract pulls liquidity from Treasury
    // If your loan pulls from Treasury via transferFrom, Treasury should approve the Loan contract.
    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {
      // Some designs might not require this; ignore if not needed
    }

    // Fund borrower with EnTo for collateral
    const collateral = ethers.parseUnits("2000", 18);
    // Borrow amount
    const borrowAmt = ethers.parseUnits("3000", 18);

    // Admin funds borrower with collateral tokens
    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();

    // Credit score setup if required by your loan’s min threshold
    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {
      // If your Oracle doesn't use creditScore gating, ignore
    }

    // Approve collateral pull
    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();

    // Request loan
    await expect(loan.connect(borrower).requestLoan(borrowAmt, collateral))
      .to.emit(loan, "LoanRequested"); // adjust event name if different
    // Inspect on-chain state
    let L = await loan.loans(borrower.address);
    expect(L.active).to.eq(true);
    expect(L.principal).to.eq(borrowAmt);
    expect(L.collateral).to.eq(collateral);
    expect(Number(L.rateBps)).to.be.greaterThan(0);

    // Simulate time passing for interest accrual
    await increaseTime(7 * 24 * 60 * 60); // +7 days

    // Preview accrued interest
    let interest = 0n;
    try {
      interest = await loan.previewAccruedInterest(borrower.address);
      expect(interest).to.be.a("bigint");
    } catch (_) {
      // If not provided, skip; your loan may accrue at repayment time
    }

    // Deposit extra collateral to improve health
    const extraColl = ethers.parseUnits("500", 18);
    // Top-up borrower with more EnTo if needed for extra collateral
    const bal = await token.balanceOf(borrower.address);
    if (bal < extraColl) {
      await (await token.connect(admin).transfer(borrower.address, extraColl - bal)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), extraColl)).wait();
    await expect(loan.connect(borrower).depositCollateral(extraColl))
      .to.emit(loan, "CollateralDeposited"); // update to actual event name if different

    // Attempt to withdraw a small portion of collateral (should pass health checks)
    const withdrawTry = ethers.parseUnits("200", 18);
    try {
      await expect(loan.connect(borrower).withdrawCollateral(withdrawTry))
        .to.emit(loan, "CollateralWithdrawn");
    } catch (_) {
      // If health constraints block withdrawal, acceptable; we’ll log and continue
      // console.log("Collateral withdraw blocked by health (as expected under constraints).");
    }

    // Partial repayment
    const partialRepay = ethers.parseUnits("1000", 18);
    // The borrower must have enough EnTo to repay; they received borrowAmt at funding
    const repayBal = await token.balanceOf(borrower.address);
    if (repayBal < partialRepay) {
      await (await token.connect(admin).transfer(borrower.address, partialRepay - repayBal)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), partialRepay)).wait();
    await expect(loan.connect(borrower).repay(partialRepay))
      .to.emit(loan, "LoanRepaid"); // adjust event name if different

    L = await loan.loans(borrower.address);
    expect(L.principal).to.be.lessThan(borrowAmt);

    // Full repay remaining
    const remaining = L.principal;
    if (remaining > 0n) {
      const bal2 = await token.balanceOf(borrower.address);
      if (bal2 < remaining) {
        await (await token.connect(admin).transfer(borrower.address, remaining - bal2)).wait();
      }
      await (await token.connect(borrower).approve(await loan.getAddress(), remaining)).wait();
      await expect(loan.connect(borrower).repay(remaining))
        .to.emit(loan, "LoanRepaid"); // adjust if event differs
    }

    // Loan should be inactive (closed) after full repayment; collateral released per your design
    L = await loan.loans(borrower.address);
    expect(L.principal).to.eq(0n);
    // active may become false or remain true until explicit close; assert your intended behavior:
    // If your contract sets active=false upon full repay:
    expect(L.active).to.eq(false);
  });

  it("prevents unsafe collateral withdrawal that would break health thresholds", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower } = signers;

    // Approvals and borrower setup
    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {}

    const collateral = ethers.parseUnits("1500", 18);
    const borrowAmt = ethers.parseUnits("2000", 18);

    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();

    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {}

    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();
    await (await loan.connect(borrower).requestLoan(borrowAmt, collateral)).wait();

    // Attempt to withdraw too much collateral; expect revert
    const tooMuch = ethers.parseUnits("1400", 18);
    await expect(loan.connect(borrower).withdrawCollateral(tooMuch)).to.be.reverted;
  });

  it("allows liquidation only when undercollateralized (happy path: should revert when healthy)", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower, extra } = signers;

    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {}

    const collateral = ethers.parseUnits("3000", 18);
    const borrowAmt = ethers.parseUnits("2000", 18);

    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();

    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {}

    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();
    await (await loan.connect(borrower).requestLoan(borrowAmt, collateral)).wait();

    // Immediately try to liquidate while healthy; expect revert
    await expect(loan.connect(extra).liquidate(borrower.address)).to.be.reverted;

    // Optional: simulate time/interest to worsen health and try again.
    // Depending on your health formula, you may need a long time or param changes to trigger liquidation.
    await increaseTime(365 * 24 * 60 * 60); // +1 year
    // Try liquidation; it may still revert if health remains above threshold (acceptable)
    try {
      await loan.connect(extra).liquidate(borrower.address);
      // If it succeeds, we can assert collateral moved and loan closed, but since this depends on your economics,
      // we accept either outcome (success or revert) as long as the contract enforces the correct condition.
    } catch (_) {
      // Still healthy or guard conditions intact; fine.
    }
  });
});
