/**
 * server.js
 * ─────────
 * Express.js API server for FedShield blockchain operations.
 *
 * Endpoints
 * ─────────
 *  POST /api/upload-and-register   – Upload model file to IPFS, register CID on-chain
 *  POST /api/submit-client-update  – Submit a client update CID on-chain
 *  POST /api/authorize-node        – Authorise a node wallet (owner only)
 *  GET  /api/latest-model          – Read latest global model CID from contract
 *  GET  /api/model-versions        – Full on-chain version history
 *  GET  /api/client-updates/:round – All client updates for a round
 *  GET  /api/current-round         – Current round number
 *  GET  /api/health                – Health / config check
 */

require("dotenv").config({ path: "../.env" });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const blockchainRoutes = require("./routes/blockchain");
const ipfsRoutes = require("./routes/ipfs");

const app = express();
const PORT = process.env.BLOCKCHAIN_PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, cb) => {
        // Allow requests from localhost (any port) and no-origin (curl / Postman)
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            cb(null, true);
        } else {
            cb(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", ipfsRoutes);
app.use("/api", blockchainRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    const required = [
        "POLYGON_AMOY_RPC_URL",
        "PRIVATE_KEY",
        "CONTRACT_ADDRESS",
        "PINATA_API_KEY",
        "PINATA_SECRET_API_KEY",
    ];

    const status = {};
    let allSet = true;

    for (const key of required) {
        const val = process.env[key] || "";
        status[key] = val ? "✅ set" : "❌ missing";
        if (!val) allSet = false;
    }

    res.json({
        server: "FedShield Blockchain API",
        network: "Polygon Amoy Testnet",
        ready: allSet,
        env: status,
        contractAddress: process.env.CONTRACT_ADDRESS || "",
    });
});

// ── Run aggregation.py ────────────────────────────────────────────────────────
app.post("/api/run-aggregation", (req, res) => {
    const scriptPath = path.resolve(__dirname, "..", "aggregation.py");
    const cwd = path.resolve(__dirname, "..");
    console.log(`▶️  Spawning: python3 ${scriptPath}`);

    const logs = [];
    const proc = spawn("python3", [scriptPath], { cwd, env: process.env });

    proc.stdout.on("data", (d) => {
        const lines = d.toString().split("\n").filter(Boolean);
        lines.forEach(l => { console.log("[agg]", l); logs.push(l); });
    });
    proc.stderr.on("data", (d) => {
        const lines = d.toString().split("\n").filter(Boolean);
        lines.forEach(l => { console.error("[agg err]", l); logs.push(l); });
    });

    proc.on("close", (code) => {
        if (code === 0) {
            res.json({ success: true, logs });
        } else {
            res.status(500).json({ success: false, code, logs });
        }
    });

    proc.on("error", (err) => {
        res.status(500).json({ success: false, error: err.message, logs });
    });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error("❌ Unhandled error:", err.message);
    res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log("🚀 FedShield Blockchain API Server");
    console.log("=".repeat(60));
    console.log(`   Listening on: http://localhost:${PORT}`);
    console.log(`   Network:      Polygon Amoy Testnet`);
    console.log(`   Contract:     ${process.env.CONTRACT_ADDRESS || "⚠️  NOT SET"}`);
    console.log("=".repeat(60));
    console.log("Endpoints:");
    console.log("  POST /api/upload-and-register");
    console.log("  POST /api/submit-client-update");
    console.log("  POST /api/authorize-node");
    console.log("  GET  /api/latest-model");
    console.log("  GET  /api/model-versions");
    console.log("  GET  /api/client-updates/:round");
    console.log("  GET  /api/current-round");
    console.log("  GET  /api/health");
    console.log("=".repeat(60));
});

module.exports = app;
