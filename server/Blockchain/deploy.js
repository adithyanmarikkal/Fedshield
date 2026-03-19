/**
 * deploy.js
 * ─────────
 * One-time deployment helper for FedShieldCoordinator on Polygon Amoy.
 *
 * Usage
 * -----
 *   node deploy.js
 *
 * After success, copy CONTRACT_ADDRESS printed to console into server/.env.
 *
 * Required .env keys
 * ------------------
 *   POLYGON_AMOY_RPC_URL   – RPC endpoint
 *   PRIVATE_KEY            – Deployer wallet private key (needs Amoy MATIC)
 *
 * Optional
 * --------
 *   NODES_REQUIRED         – Min clients per round (default: 1)
 *   INITIAL_MODEL_CID      – Seed CID; falls back to blockchain.txt
 */

require("dotenv").config({ path: "../.env" });

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { readBlockchainTxt } = require("./lib/blockchainTxt");

// ── Paths ─────────────────────────────────────────────────────────────────────
const ABI_PATH = path.join(__dirname, "contract_abi.json");
const CONTRACT_PATH = path.join(__dirname, "contract.sol");

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitialCid() {
    const envCid = (process.env.INITIAL_MODEL_CID || "").trim();
    if (envCid) return envCid;

    const txtCid = readBlockchainTxt();
    if (txtCid) return txtCid;

    return "QmPlaceholder_replace_with_real_CID_after_first_training";
}

// ── Deploy ────────────────────────────────────────────────────────────────────

async function deploy() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀  Deploying FedShieldCoordinator → Polygon Amoy");
    console.log("=".repeat(60));

    // Validate env
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
    const privateKey = (process.env.PRIVATE_KEY || "").trim();

    if (!privateKey) {
        console.error("❌  PRIVATE_KEY not set in .env");
        process.exit(1);
    }

    const nodesRequired = parseInt(process.env.NODES_REQUIRED || "1", 10);
    const initialCid = getInitialCid();

    console.log(`   RPC:             ${rpcUrl}`);
    console.log(`   Nodes required:  ${nodesRequired}`);
    console.log(`   Initial CID:     ${initialCid}`);

    // Connect
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    console.log(`\n👛 Deployer: ${wallet.address}`);
    console.log(`   Balance:  ${ethers.formatEther(balance)} MATIC`);

    if (parseFloat(ethers.formatEther(balance)) < 0.01) {
        console.warn("⚠️  Low balance – get free MATIC: https://faucet.polygon.technology");
    }

    // Read ABI + bytecode from contract_abi.json (ABI only)
    // For deployment we need bytecode – read from a compiled artifact if available,
    // otherwise prompt the user to compile with hardhat/foundry first.
    const compiledPath = path.join(__dirname, "compiled_contract.json");

    if (!fs.existsSync(compiledPath)) {
        console.error(
            "\n❌  Compiled contract artifact not found.\n" +
            "    Compile the contract first:\n\n" +
            "      # Option A – Hardhat\n" +
            "      npx hardhat compile\n\n" +
            "      # Option B – Foundry\n" +
            "      forge build\n\n" +
            "    Then copy the compiled JSON to:\n" +
            `      ${compiledPath}\n\n` +
            "    The JSON must have the shape: { abi: [...], bytecode: '0x...' }"
        );
        process.exit(1);
    }

    const compiled = JSON.parse(fs.readFileSync(compiledPath, "utf8"));
    const abi = compiled.abi;
    const bytecode = compiled.bytecode;

    if (!bytecode || bytecode === "0x") {
        console.error("❌  bytecode is empty in compiled_contract.json");
        process.exit(1);
    }

    // Deploy
    console.log("\n📡 Deploying contract…");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(nodesRequired, initialCid);

    console.log(`⏳ Tx hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Explorer: https://www.oklink.com/amoy/tx/${contract.deploymentTransaction().hash}`);
    console.log("   Waiting for confirmation…");

    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();

    // Write ABI to contract_abi.json (update with freshly compiled ABI)
    fs.writeFileSync(ABI_PATH, JSON.stringify(abi, null, 2));

    console.log("\n✅  Contract deployed!");
    console.log(`   Address: ${deployedAddress}`);
    console.log(`   Block:   ${(await contract.deploymentTransaction().wait()).blockNumber}`);

    console.log("\n" + "=".repeat(60));
    console.log("📋  NEXT STEPS");
    console.log("=".repeat(60));
    console.log("1. Add to server/.env:");
    console.log(`   CONTRACT_ADDRESS=${deployedAddress}`);
    console.log();
    console.log("2. Start the API server:");
    console.log("   npm start");
    console.log();
    console.log("3. Authorise client node wallets (one per client):");
    console.log("   POST http://localhost:4000/api/authorize-node");
    console.log('   Body: { "address": "0x<CLIENT_WALLET_ADDRESS>" }');
    console.log("=".repeat(60));

    return deployedAddress;
}

deploy().catch((err) => {
    console.error("❌ Deployment failed:", err.message);
    process.exit(1);
});
