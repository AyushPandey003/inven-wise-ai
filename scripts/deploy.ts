/**
 * Deploy InventoryProvenance to Ethereum Sepolia
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network hardhatMainnet    # local test
 *   npx hardhat run scripts/deploy.ts --network sepolia           # Ethereum Sepolia testnet
 */

import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deploying InventoryProvenance");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployer :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("  Balance  :", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ Deployer has 0 ETH! Get test ETH from a faucet first.");
    process.exit(1);
  }

  console.log("\n⏳ Deploying contract...");
  const contract = await ethers.deployContract("InventoryProvenance");
  const address = await contract.getAddress();
  const txHash = contract.deploymentTransaction()?.hash;

  console.log("\n✅ InventoryProvenance deployed!");
  console.log("  Address  :", address);
  console.log("  Tx Hash  :", txHash);
  
  try {
    const owner = await contract.owner();
    console.log("  Owner    :", owner);
  } catch {
    console.log("  Owner    : [being indexed]");
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress: address,
    deployer: deployer.address,
    transactionHash: txHash,
    blockNumber: contract.deploymentTransaction()?.blockNumber,
    timestamp: new Date().toISOString(),
    network: "sepolia",
    chainId: 11155111,
    explorerUrl: `https://sepolia.etherscan.io/address/${address}`,
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also copy ABI for frontend
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "InventoryProvenance.sol",
    "InventoryProvenance.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    fs.writeFileSync(
      path.join(process.cwd(), "src", "lib", "InventoryProvenanceABI.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
    console.log("\n📄 ABI copied to src/lib/InventoryProvenanceABI.json");
  }

  console.log("📄 Deployment info saved to deployments/sepolia.json");
  console.log(`\n🔍 View on BaseScan: ${deploymentInfo.explorerUrl}`);
  console.log(`\n📝 Add to your .env:`);
  console.log(`   VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
