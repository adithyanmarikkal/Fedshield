const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const FedShieldCoordinator = await hre.ethers.getContractFactory("FedShieldCoordinator");
  // The constructor in contract.sol does not take arguments
  const contract = await FedShieldCoordinator.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("FedShieldCoordinator deployed to:", address);

  // Write address to .env
  const envPath = path.join(__dirname, "../../.env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
  }
  
  // Regex to replace or append CONTRACT_ADDRESS
  if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${address}`);
  } else {
      envContent += `\nCONTRACT_ADDRESS=${address}`;
  }
  fs.writeFileSync(envPath, envContent.trim() + "\n");

  // Save the compiled ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/contract.sol/FedShieldCoordinator.json");
  if (fs.existsSync(artifactPath)) {
      const artifact = require(artifactPath);
      const abiPath = path.join(__dirname, "../contract_abi.json");
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
      console.log("Updated contract_abi.json");
  }
  
  console.log("Fully updated!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
