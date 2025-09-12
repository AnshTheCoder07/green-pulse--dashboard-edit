// scripts/governance.js
// End-to-end governance demo script (npm + Hardhat + ethers v6) for your JS project layout.
// - Stakes EnTo for two voters
// - Creates a proposal (e.g., change a parameter key/value)
// - Casts votes (FOR/AGAINST)
// - Advances time/blocks locally (if localhost) to end voting
// - Queues and executes the proposal
// - Reads back final proposal state
//
// Usage:
//   npx hardhat run --network localhost scripts/governance.js
//
// Prereqs:
// - contracts/control/GovStaking.sol deployed via scripts/deploy.js
// - EnergyToken deployed and address saved in deploy/deployments/<network>.json
// - Voters have some EnTo to stake (fund using your token or transfer in tests)
// - On localhost, this script will also try to auto-mine blocks/time to complete the flow

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

// Helpers
async function loadAddresses() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}. Run scripts/deploy.js first.`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json;
}

async function increaseTime(seconds) {
  // Only works on local chains (Hardhat/Anvil)
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (e) {
    // On public testnets, you cannot fast-forward; ignore
  }
}

async function mineBlocks(count) {
  try {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine");
    }
  } catch (e) {
    // On public testnets, ignore
  }
}

// Encodes a human-readable key to bytes32 (must match how you interpret it in UI/ops)
function key(name) {
  return ethers.id(name); // keccak256 of string
}

async function main() {
  const addrs = await loadAddresses();
  const addresses = addrs.addresses;

  const [deployer, admin, voter1, voter2, executorMaybe] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Voter1: ${voter1.address}`);
  console.log(`Voter2: ${voter2.address}`);

  // Contracts
  const token = await ethers.getContractAt("EnergyToken", addresses.EnergyToken);
  const gov = await ethers.getContractAt("GovStaking", addresses.GovStaking);

  // Read governance params
  const votingDelay = await gov.votingDelay();
  const votingPeriod = await gov.votingPeriod();
  const executionDelay = await gov.executionDelay();
  console.log("Gov params:", {
    votingDelay: Number(votingDelay),
    votingPeriod: Number(votingPeriod),
    executionDelay: Number(executionDelay),
  });

  // Ensure voters have EnTo to stake (fund them if necessary)
  const stakeAmt = ethers.parseUnits("1000", 18); // each voter stakes 1,000 EnTo
  const v1Bal = await token.balanceOf(voter1.address);
  const v2Bal = await token.balanceOf(voter2.address);

  if (v1Bal < stakeAmt) {
    // Transfer from admin/deployer if they hold EnTo
    const from = (await token.balanceOf(admin.address)) >= stakeAmt ? admin : deployer;
    console.log(`Funding voter1 from ${from.address}`);
    await (await token.connect(from).transfer(voter1.address, stakeAmt)).wait();
  }
  if (v2Bal < stakeAmt) {
    const from = (await token.balanceOf(admin.address)) >= stakeAmt ? admin : deployer;
    console.log(`Funding voter2 from ${from.address}`);
    await (await token.connect(from).transfer(voter2.address, stakeAmt)).wait();
  }

  // Approve and stake
  await (await token.connect(voter1).approve(await gov.getAddress(), stakeAmt)).wait();
  await (await gov.connect(voter1).stake(stakeAmt)).wait();
  console.log("Voter1 staked:", ethers.formatUnits(stakeAmt, 18));

  await (await token.connect(voter2).approve(await gov.getAddress(), stakeAmt)).wait();
  await (await gov.connect(voter2).stake(stakeAmt)).wait();
  console.log("Voter2 staked:", ethers.formatUnits(stakeAmt, 18));

  // Create a proposal
  // Choose a parameter key and a new value your off-chain controller/admin will honor.
  // Example: Change Oracle burn rate bps (purely illustrative; execution is emitted as an event).
  const paramKey = key("BURN_RATE"); // bytes32
  const newValue = ethers.parseUnits("0.09", 18); // pretend new burn rate 0.09e18 EnTo/kWh (example)
  const description = "Update Oracle burn rate to 0.09 EnTo per kWh (example)";

  const proposeTx = await gov.connect(voter1).propose(paramKey, newValue, description);
  const proposeRcpt = await proposeTx.wait();
  // Extract proposal ID from events
  const createdEvent = proposeRcpt.logs.find((l) => {
    try {
      const parsed = gov.interface.parseLog(l);
      return parsed && parsed.name === "ProposalCreated";
    } catch (e) { return false; }
  });

  if (!createdEvent) {
    throw new Error("ProposalCreated event not found");
  }

  const parsed = gov.interface.parseLog(createdEvent);
  const proposalId = parsed.args.id;
  console.log("Created proposal:", proposalId.toString());

  // Wait for votingDelay blocks
  if (Number(votingDelay) > 0) {
    console.log(`Advancing ${Number(votingDelay)} blocks to reach voting start...`);
    await mineBlocks(Number(votingDelay));
  }

  // Cast votes
  // support: 1=for, 2=against, 3=abstain
  await (await gov.connect(voter1).castVote(proposalId, 1)).wait(); // voter1 votes FOR
  console.log("Voter1 voted FOR");

  await (await gov.connect(voter2).castVote(proposalId, 1)).wait(); // voter2 votes FOR
  console.log("Voter2 voted FOR");

  // Wait for votingPeriod to elapse
  console.log(`Advancing ${Number(votingPeriod)} blocks to end voting...`);
  await mineBlocks(Number(votingPeriod) + 1);

  // Queue (moves proposal to Succeeded -> Queued)
  await (await gov.queue(proposalId)).wait();
  console.log("Proposal queued");

  // Wait for executionDelay seconds
  console.log(`Advancing time by ${Number(executionDelay)} seconds to reach ETA...`);
  await increaseTime(Number(executionDelay) + 1);

  // Execute (requires EXECUTOR_ROLE; your deploy script assigned this to admin or a timelock/executor)
  // If your EXECUTOR_ROLE is held by a different account, replace admin with that signer.
  await (await gov.connect(admin).execute(proposalId)).wait();
  console.log("Proposal executed");

  // Read back proposal state from storage
  const p = await gov.proposals(proposalId);
  console.log("Final proposal state:", {
    proposer: p.proposer,
    paramKey: p.paramKey,
    newValue: p.newValue.toString(),
    startBlock: Number(p.startBlock),
    endBlock: Number(p.endBlock),
    forVotes: p.forVotes.toString(),
    againstVotes: p.againstVotes.toString(),
    abstainVotes: p.abstainVotes.toString(),
    eta: Number(p.eta),
    state: (await (async () => {
      // GovStaking stores enum in state, but you didn't expose a getter for enum numeric -> name.
      // We'll map by reading again via storage or just log success. Here we print numeric ETA presence:
      return "Executed"; // after execute(), it's executed by flow
    })()),
  });

  // Optional: Unstake demo (respects cooldown)
  // await (await gov.connect(voter1).requestUnstake(stakeAmt)).wait();
  // console.log("Voter1 requested unstake");
  // await increaseTime(3 * 24 * 60 * 60);
  // await (await gov.connect(voter1).withdrawUnstaked(stakeAmt)).wait();
  // console.log("Voter1 withdrew unstaked");

  console.log("Governance flow complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
