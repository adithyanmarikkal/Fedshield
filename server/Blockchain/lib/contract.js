/**
 * lib/contract.js
 * ───────────────
 * Ethers.js v6 wrapper for the FedShieldCoordinator contract on Polygon Amoy.
 *
 * All functions return ethers TransactionReceipt (write) or decoded values (read).
 */

const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// ── Load ABI ──────────────────────────────────────────────────────────────────
const ABI_PATH = path.join(__dirname, "..", "contract_abi.json");

if (!fs.existsSync(ABI_PATH)) {
    throw new Error(`ABI not found at ${ABI_PATH}. Make sure contract_abi.json exists.`);
}

const ABI = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

// ── Provider + Signer (lazy-initialised once) ─────────────────────────────────
let _provider = null;
let _signer = null;
let _contractRO = null;   // read-only  (provider runner)
let _contractRW = null;   // read-write (signer runner)

function getProvider() {
    if (_provider) return _provider;

    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
    _provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`🔌 Provider: ${rpcUrl}`);
    return _provider;
}

function getSigner() {
    if (_signer) return _signer;

    const pk = (process.env.PRIVATE_KEY || "").trim();
    if (!pk) throw new Error("PRIVATE_KEY not set in .env");

    _signer = new ethers.Wallet(pk, getProvider());
    console.log(`👛 Signer address: ${_signer.address}`);
    return _signer;
}

function getContract(readOnly = false) {
    const address = (process.env.CONTRACT_ADDRESS || "").trim();
    if (!address) {
        throw new Error(
            "CONTRACT_ADDRESS not set in .env.\n" +
            "Deploy the contract first and add the address."
        );
    }

    if (readOnly) {
        if (!_contractRO) {
            _contractRO = new ethers.Contract(address, ABI, getProvider());
            console.log(`📄 Contract (read-only): ${address}`);
        }
        return _contractRO;
    } else {
        if (!_contractRW) {
            _contractRW = new ethers.Contract(address, ABI, getSigner());
            console.log(`📄 Contract (read-write): ${address}`);
        }
        return _contractRW;
    }
}

// ── Write functions ────────────────────────────────────────────────────────────

/**
 * Call updateGlobalModel(newCID) on the contract.
 * Only the contract owner can call this.
 *
 * @param {string} cid – IPFS CID of the new aggregated global model
 * @returns {ethers.TransactionReceipt}
 */
async function updateGlobalModel(cid) {
    const contract = getContract(false);
    console.log(`🔗 updateGlobalModel("${cid}")`);

    const tx = await contract.updateGlobalModel(cid);
    console.log(`⏳ Tx pending: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block #${receipt.blockNumber}`);
    return receipt;
}

/**
 * Call submitLocalUpdate(cid, metadata) as an authorised node.
 *
 * @param {string} cid      – IPFS CID of the client training record
 * @param {string} metadata – Optional info string e.g. "samples=5000,acc=0.91"
 * @returns {ethers.TransactionReceipt}
 */
async function submitClientUpdate(cid, metadata = "") {
    const contract = getContract(false);
    console.log(`📨 submitLocalUpdate("${cid}", "${metadata}")`);

    const tx = await contract.submitLocalUpdate(cid, metadata);
    console.log(`⏳ Tx pending: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block #${receipt.blockNumber}`);
    return receipt;
}

/**
 * Call addNode(address) to authorise a client node.
 * Only the contract owner can call this.
 *
 * @param {string} nodeAddress – Ethereum address of the node to authorise
 * @returns {ethers.TransactionReceipt}
 */
async function authorizeNode(nodeAddress) {
    const contract = getContract(false);
    const checksummed = ethers.getAddress(nodeAddress); // throws if invalid
    console.log(`🔐 addNode("${checksummed}")`);

    const tx = await contract.addNode(checksummed);
    console.log(`⏳ Tx pending: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block #${receipt.blockNumber}`);
    return receipt;
}

/**
 * Call revokeNode(address) to remove authorisation from a client node.
 * Only the contract owner can call this.
 *
 * @param {string} nodeAddress – Ethereum address of the node to revoke
 * @returns {ethers.TransactionReceipt}
 */
async function revokeNode(nodeAddress) {
    const contract = getContract(false);
    const checksummed = ethers.getAddress(nodeAddress); // throws if invalid
    console.log(`🔐 revokeNode("${checksummed}")`);

    const tx = await contract.revokeNode(checksummed);
    console.log(`⏳ Tx pending: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block #${receipt.blockNumber}`);
    return receipt;
}

// ── Read functions (no gas) ───────────────────────────────────────────────────

/**
 * @returns {string} Latest global model CID
 */
async function getLatestModelCID() {
    const contract = getContract(true);
    return await contract.getLatestModelCID();
}

/**
 * @returns {Array} All GlobalModelVersion structs
 */
async function getAllModelVersions() {
    const contract = getContract(true);
    return await contract.getAllModelVersions();
}

/**
 * @param {number} round
 * @returns {Array} ClientUpdate structs for the given round
 */
async function getClientUpdatesForRound(round) {
    const contract = getContract(true);
    return await contract.getClientUpdatesForRound(round);
}

/**
 * @returns {bigint} Current round number
 */
async function getCurrentRound() {
    const contract = getContract(true);
    return await contract.currentRound();
}

/**
 * @returns {bigint} Total model versions recorded
 */
async function getTotalModelVersions() {
    const contract = getContract(true);
    return await contract.totalModelVersions();
}

module.exports = {
    getProvider,
    getSigner,
    getContract,
    // Write
    updateGlobalModel,
    submitClientUpdate,
    authorizeNode,
    revokeNode,
    // Read
    getLatestModelCID,
    getAllModelVersions,
    getClientUpdatesForRound,
    getCurrentRound,
    getTotalModelVersions,
};
