/**
 * routes/blockchain.js
 * ─────────────────────
 * Contract interaction routes (read + write).
 *
 *  POST /api/submit-client-update   – submitLocalUpdate(cid, metadata)
 *  POST /api/authorize-node         – addNode(address)   [owner only]
 *  GET  /api/latest-model           – getLatestModelCID()
 *  GET  /api/model-versions         – getAllModelVersions()
 *  GET  /api/client-updates/:round  – getClientUpdatesForRound(round)
 *  GET  /api/current-round          – currentRound()
 *  GET  /api/owner                  – Returns the server signer address (contract owner)
 */

const express = require("express");
const { ethers } = require("ethers");
const {
    updateGlobalModel,
    submitClientUpdate,
    authorizeNode,
    revokeNode,
    getLatestModelCID,
    getAllModelVersions,
    getClientUpdatesForRound,
    getCurrentRound,
    getSigner,
    getContract,
} = require("../lib/contract");

const router = express.Router();

// ── GET /api/owner ────────────────────────────────────────────────────────────
/**
 * Returns the Ethereum address of the deployer wallet address defined in .env.
 * The frontend compares this against the connected MetaMask address to
 * decide whether to grant admin access.
 */
router.get("/owner", (req, res) => {
    try {
        const ownerAddress = process.env.WALLET_ADDRESS || "";
        res.json({ owner: ownerAddress.toLowerCase() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/authorized-nodes ─────────────────────────────────────────────────
/**
 * Returns the list of currently authorized nodes by scanning
 * NodeAuthorized / NodeRevoked events from the contract.
 */
router.get("/authorized-nodes", async (_req, res) => {
    try {
        const contract = getContract(true);
        const provider = contract.runner;

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 50000);

        const authFilter = contract.filters.NodeAuthorized();
        const revokeFilter = contract.filters.NodeRevoked();

        const [authEvents, revokeEvents] = await Promise.all([
            contract.queryFilter(authFilter, fromBlock, latestBlock),
            contract.queryFilter(revokeFilter, fromBlock, latestBlock),
        ]);

        // Build a map: address -> { authorized, block, txHash }
        const nodeMap = new Map();

        for (const e of authEvents) {
            const addr = e.args.node;
            nodeMap.set(addr.toLowerCase(), {
                address: addr,
                authorized: true,
                block: e.blockNumber,
                txHash: e.transactionHash,
            });
        }
        for (const e of revokeEvents) {
            const addr = e.args.node;
            const existing = nodeMap.get(addr.toLowerCase());
            // Only mark revoked if revoke happened after authorize
            if (!existing || e.blockNumber > existing.block) {
                nodeMap.set(addr.toLowerCase(), {
                    address: addr,
                    authorized: false,
                    block: e.blockNumber,
                    txHash: e.transactionHash,
                });
            }
        }

        // Double-check on-chain authorization status
        const nodes = [];
        for (const [, info] of nodeMap) {
            const isAuth = await contract.authorizedNodes(info.address);
            nodes.push({
                address: info.address,
                authorized: isAuth,
                lastTxHash: info.txHash,
                lastBlock: info.block,
                explorer: `https://www.oklink.com/amoy/tx/${info.txHash}`,
            });
        }

        res.json({ total: nodes.length, nodes });
    } catch (err) {
        console.error("❌ authorized-nodes error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/submit-client-update ────────────────────────────────────────────
/**
 * Body (JSON): { cid: string, metadata?: string }
 * Returns:     { txHash, blockNumber, cid }
 */
router.post("/submit-client-update", async (req, res) => {
    const { cid, metadata = "" } = req.body;

    if (!cid) {
        return res.status(400).json({ error: "'cid' is required in the request body." });
    }

    try {
        console.log(`\n📨 submitClientUpdate  CID=${cid}  metadata="${metadata}"`);
        const receipt = await submitClientUpdate(cid, metadata);
        console.log(`✅ Tx: ${receipt.hash}  block #${receipt.blockNumber}`);

        res.json({
            success: true,
            cid,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`,
        });
    } catch (err) {
        console.error("❌ submit-client-update error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/authorize-node ──────────────────────────────────────────────────
/**
 * Body (JSON): { address: string }   (owner only)
 * Returns:     { txHash, blockNumber, address }
 */
router.post("/authorize-node", async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "'address' is required in the request body." });
    }

    try {
        console.log(`\n🔐 authorizeNode  address=${address}`);
        const receipt = await authorizeNode(address);
        console.log(`✅ Tx: ${receipt.hash}  block #${receipt.blockNumber}`);

        res.json({
            success: true,
            address,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`,
        });
    } catch (err) {
        console.error("❌ authorize-node error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/revoke-node ──────────────────────────────────────────────────
/**
 * Body (JSON): { address: string }   (owner only)
 * Returns:     { txHash, blockNumber, address }
 */
router.post("/revoke-node", async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "'address' is required in the request body." });
    }

    try {
        console.log(`\n🔓 revokeNode  address=${address}`);
        const receipt = await revokeNode(address);
        console.log(`✅ Tx: ${receipt.hash}  block #${receipt.blockNumber}`);

        res.json({
            success: true,
            address,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`,
        });
    } catch (err) {
        console.error("❌ revoke-node error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/latest-model ─────────────────────────────────────────────────────
router.get("/latest-model", async (_req, res) => {
    try {
        const cid = await getLatestModelCID();
        res.json({
            cid,
            gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/model-versions ───────────────────────────────────────────────────
router.get("/model-versions", async (_req, res) => {
    try {
        const versions = await getAllModelVersions();

        // Serialise BigInt → Number for JSON
        const parsed = versions.map((v) => ({
            version: Number(v.version),
            round: Number(v.round),
            ipfsCID: v.ipfsCID,
            timestamp: Number(v.timestamp),
            recordedAt: new Date(Number(v.timestamp) * 1000).toISOString(),
            recordedBy: v.recordedBy,
            gateway: `https://gateway.pinata.cloud/ipfs/${v.ipfsCID}`,
        }));

        res.json({ total: parsed.length, versions: parsed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/client-updates/:round ────────────────────────────────────────────
router.get("/client-updates/:round", async (req, res) => {
    const round = parseInt(req.params.round, 10);

    if (isNaN(round) || round < 0) {
        return res.status(400).json({ error: "':round' must be a non-negative integer." });
    }

    try {
        const updates = await getClientUpdatesForRound(round);

        const parsed = updates.map((u) => ({
            nodeAddress: u.nodeAddress,
            ipfsCID: u.ipfsCID,
            timestamp: Number(u.timestamp),
            submittedAt: new Date(Number(u.timestamp) * 1000).toISOString(),
            metadata: u.metadata,
            gateway: `https://gateway.pinata.cloud/ipfs/${u.ipfsCID}`,
        }));

        res.json({ round, total: parsed.length, updates: parsed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/current-round ────────────────────────────────────────────────────
router.get("/current-round", async (_req, res) => {
    try {
        const round = await getCurrentRound();
        res.json({ currentRound: Number(round) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/update-global-model ─────────────────────────────────────────────
/**
 * Register an already-uploaded IPFS CID as the new global model on-chain.
 * Called by main.py after it uploads the model to IPFS itself.
 *
 * Body (JSON): { cid: string }
 * Returns:     { success, cid, txHash, blockNumber, explorer }
 */
router.post("/update-global-model", async (req, res) => {
    const { cid } = req.body;

    if (!cid) {
        return res.status(400).json({ error: "'cid' is required in the request body." });
    }

    try {
        console.log(`\n🌐 updateGlobalModel  CID=${cid}`);
        const receipt = await updateGlobalModel(cid);
        console.log(`✅ Tx: ${receipt.hash}  block #${receipt.blockNumber}`);

        res.json({
            success: true,
            cid,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`,
        });
    } catch (err) {
        console.error("❌ update-global-model error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
