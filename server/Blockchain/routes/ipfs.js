/**
 * routes/ipfs.js
 * ──────────────
 * IPFS-related routes via Pinata.
 *
 *  POST /api/upload-model     – Upload a model JSON file, return CID
 *  POST /api/upload-and-register – Upload model + register CID on-chain +
 *                                  update blockchain.txt (one-shot)
 */

const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { updateGlobalModel, submitClientUpdate } = require("../lib/contract");
const { writeBlockchainTxt } = require("../lib/blockchainTxt");

const router = express.Router();

// Store uploaded file in /tmp so we can stream it to Pinata
const upload = multer({ dest: "/tmp/fedshield_uploads/" });

// ── Helper ────────────────────────────────────────────────────────────────────

async function pinFileToPinata(filePath, pinName) {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_API_KEY;

    if (!apiKey || !secretKey) {
        throw new Error("PINATA_API_KEY / PINATA_SECRET_API_KEY not set in .env");
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("pinataMetadata", JSON.stringify({ name: pinName }));

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        form,
        {
            headers: {
                ...form.getHeaders(),
                pinata_api_key: apiKey,
                pinata_secret_api_key: secretKey,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120_000,
        }
    );

    return response.data.IpfsHash;
}

// ── POST /api/upload-model ────────────────────────────────────────────────────
/**
 * Upload a model file to IPFS via Pinata.
 * Body: multipart/form-data with field "model" (file) and optional "pinName" (text)
 * Returns: { cid, gateway }
 */
router.post("/upload-model", upload.single("model"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Use field name 'model'." });
    }

    const pinName = req.body.pinName || `fedshield_model_${Date.now()}`;

    try {
        console.log(`📤 Uploading ${req.file.originalname} to IPFS…`);
        const cid = await pinFileToPinata(req.file.path, pinName);

        console.log(`✅ IPFS CID: ${cid}`);
        res.json({
            success: true,
            cid,
            gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
        });
    } catch (err) {
        console.error("❌ IPFS upload error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        // Clean up temp file
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// ── POST /api/upload-and-register ─────────────────────────────────────────────
/**
 * Upload model to IPFS, call updateGlobalModel() on the contract,
 * and overwrite blockchain.txt.
 *
 * Body: multipart/form-data with field "model" (file)
 * Returns: { cid, txHash, blockNumber, gateway }
 */
router.post("/upload-and-register", upload.single("model"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Use field name 'model'." });
    }

    const pinName = req.body.pinName || `fedshield_global_${Date.now()}`;

    try {
        // Step 1 – Upload to IPFS
        console.log(`\n${"=".repeat(60)}`);
        console.log("🚀 UPLOAD & REGISTER – starting");
        console.log(`📤 Uploading ${req.file.originalname} to IPFS…`);
        const cid = await pinFileToPinata(req.file.path, pinName);
        console.log(`✅ CID: ${cid}`);

        // Step 2 – Register on Polygon Amoy
        console.log("🔗 Calling updateGlobalModel() on contract…");
        const receipt = await updateGlobalModel(cid);
        console.log(`✅ Tx: ${receipt.hash}  block #${receipt.blockNumber}`);

        // Step 3 – Update blockchain.txt
        writeBlockchainTxt(cid);
        console.log("📝 blockchain.txt updated");
        console.log("=".repeat(60));

        res.json({
            success: true,
            cid,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
            explorer: `https://www.oklink.com/amoy/tx/${receipt.hash}`,
        });
    } catch (err) {
        console.error("❌ upload-and-register error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

module.exports = router;
