/**
 * lib/blockchainTxt.js
 * ─────────────────────
 * Utilities for reading and writing blockchain.txt –
 * the simple text file that acts as a dynamic pointer to the
 * latest global model CID for the Python ML pipeline.
 */

const fs = require("fs");
const path = require("path");

// Default path assumes this file lives at server/Blockchain/lib/
const DEFAULT_PATH = path.join(
    __dirname, "..", "..", "machiene learning", "blockchain.txt"
);

const BC_TXT_PATH = process.env.BLOCKCHAIN_TXT_PATH || DEFAULT_PATH;

/**
 * Read the latest global model CID from blockchain.txt.
 * Returns null if the file doesn't exist or has no recognisable CID.
 *
 * @returns {string|null}
 */
function readBlockchainTxt() {
    if (!fs.existsSync(BC_TXT_PATH)) return null;

    const lines = fs.readFileSync(BC_TXT_PATH, "utf8").split("\n");
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("Global mode=")) {
            return line.split("=")[1].trim();
        }
        if (line.startsWith("Qm") || line.startsWith("bafy")) {
            return line;
        }
    }
    return null;
}

/**
 * Overwrite blockchain.txt with the new CID.
 * The format "Global mode=<CID>" is what client.py reads.
 *
 * @param {string} cid
 */
function writeBlockchainTxt(cid) {
    const dir = path.dirname(BC_TXT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BC_TXT_PATH, `Global mode=${cid}`, "utf8");
    console.log(`📝 blockchain.txt → ${cid}`);
    console.log(`   Path: ${BC_TXT_PATH}`);
}

module.exports = { readBlockchainTxt, writeBlockchainTxt, BC_TXT_PATH };
