# FedShield

A federated learning dashboard built on blockchain. Local model updates are pinned to IPFS via Pinata and registered on the **Polygon Amoy testnet** smart contract. The admin runs FedAvg aggregation to produce and publish a new global model each round.

---

## Architecture

```
┌─────────────────────┐        ┌────────────────────────────┐
│  Frontend (React)   │◄──────►│  Blockchain API (Express)  │
│  Vite · port 5173   │        │  port 4000                 │
└─────────────────────┘        └────────────┬───────────────┘
                                             │
                         ┌───────────────────┼─────────────────┐
                         ▼                   ▼                  ▼
                   Polygon Amoy       Pinata / IPFS       aggregation.py
                   (smart contract)   (model storage)     (FedAvg script)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, ethers.js v6, React Router v7 |
| Backend API | Node.js, Express 4, ethers.js v6, Multer, Axios |
| Blockchain | Solidity (Polygon Amoy), Hardhat |
| Storage | IPFS via Pinata |
| Aggregation | Python 3, NumPy, Requests |
| Wallet | MetaMask (browser extension) |

---

## Prerequisites

- **Node.js** ≥ 18  
- **Python 3** with `pip`  
- **MetaMask** browser extension configured for Polygon Amoy  
- A **Pinata** account ([pinata.cloud](https://pinata.cloud)) — free tier is sufficient  
- A **Polygon Amoy** RPC URL (Alchemy or Ankr recommended — public RPC can be unstable)  
- A **deployed** `FedShieldCoordinator` smart contract on Amoy (owner wallet required for admin actions)

---

## Project Structure

```
.
├── frontend/          # React + Vite app
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── UserHome.jsx
│       │   ├── AdminHome.jsx
│       │   └── Blockchain.jsx
│       └── index.css
└── server/
    ├── .env                 # shared environment variables
    ├── aggregation.py       # FedAvg aggregation script
    ├── model/               # local model files (not committed)
    └── Blockchain/
        ├── server.js        # Express API server
        ├── routes/
        │   ├── blockchain.js
        │   └── ipfs.js
        └── lib/
            └── contract.js  # ethers.js contract helpers
```

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "New Folder (1)"
```

### 2. Configure environment variables

Create `server/.env` with these values:

```env
# Polygon Amoy RPC — use Alchemy or Ankr, NOT the default public RPC
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Deployer/owner wallet private key (hex, no 0x prefix)
PRIVATE_KEY=your_private_key_here

# Deployed smart contract address
CONTRACT_ADDRESS=0xYourContractAddress

# Pinata credentials for IPFS uploads
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token

# IPFS gateway (default: Pinata public gateway)
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# Model directory (absolute path)
MODEL_DIR=/absolute/path/to/server/model
```

> **Security:** Never commit `.env` to version control. It contains your private key.

### 3. Install backend dependencies

```bash
cd "server/Blockchain"
npm install
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Install Python dependencies

```bash
cd server
pip install requests numpy
```

---

## Running the App

You need **three** things running simultaneously:

### Terminal 1 — Blockchain API Server

```bash
cd "server/Blockchain"
node server.js
```

Server starts on **http://localhost:4000**. Confirm with:

```bash
curl http://localhost:4000/api/health
```

### Terminal 2 — Frontend Dev Server

```bash
cd frontend
npm run dev
```

Opens on **http://localhost:5173** (or next available port).

### Open in Browser

Navigate to **http://localhost:5173**. Connect MetaMask — you'll be routed to:

- **Admin panel** (`/admin`) if your wallet is the contract owner  
- **User dashboard** (`/home`) for all other wallets

---

## User Flows

### Participant (any wallet)

1. Connect MetaMask on the login page  
2. **Dashboard** — view current round, global model CID, connected client count, and model version history  
3. **Upload Local Model** — drag-and-drop a `.json` weights file:  
   - File is pinned to IPFS via Pinata  
   - `submitLocalUpdate(cid, metadata)` transaction is sent from your wallet  
   - MetaMask will prompt for signature (make sure you're on **Polygon Amoy**)

> **Note:** Your wallet must be authorized by the admin before you can submit updates.

### Admin (contract owner wallet)

1. Connect MetaMask — automatically routed to `/admin`  
2. **Node Management** — authorize or revoke participant wallets  
3. **Verify Client Updates** — view all submissions across all rounds  
4. **Aggregation** — click **Run Aggregation** to trigger `aggregation.py`:  
   - Fetches client CIDs from the blockchain  
   - Downloads each model from IPFS  
   - Runs FedAvg  
   - Uploads global model to IPFS  
   - Registers the new CID on-chain (advances the round)

---

## Running Aggregation Manually

```bash
cd server

# Aggregate the current round
python aggregation.py

# Aggregate a specific round
python aggregation.py --round 3

# Use a custom API URL
python aggregation.py --api http://localhost:4000
```

The script uses the same `server/.env` (via the `--api` flag pointing to the running Express server).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check, returns contract address |
| `GET` | `/api/current-round` | Current federated learning round |
| `GET` | `/api/latest-model` | Latest global model CID |
| `GET` | `/api/model-versions` | Full on-chain version history |
| `GET` | `/api/client-updates/:round` | Client submissions for a round |
| `POST` | `/api/upload-and-register` | Upload model to IPFS + register on-chain (admin) |
| `POST` | `/api/authorize-node` | Authorize a wallet address (owner only) |
| `POST` | `/api/revoke-node` | Revoke a wallet address (owner only) |
| `POST` | `/api/run-aggregation` | Trigger `aggregation.py` subprocess |

Base URL: `http://localhost:4000/api`

---

## Troubleshooting

### `GET /api/current-round` returns 500 or hangs

The public Polygon Amoy RPC (`https://rpc-amoy.polygon.technology`) is unreliable. Switch to a dedicated provider:

```env
# Alchemy (recommended)
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Ankr (free, no key needed)
POLYGON_AMOY_RPC_URL=https://rpc.ankr.com/polygon_amoy
```

Restart the server after editing `.env`.

### MetaMask says "Wrong Network"

The frontend will prompt MetaMask to switch to Polygon Amoy automatically. If it fails, add the network manually:

| Field | Value |
|-------|-------|
| Network Name | Polygon Amoy Testnet |
| RPC URL | `https://rpc-amoy.polygon.technology` |
| Chain ID | `80002` |
| Currency Symbol | `MATIC` |
| Block Explorer | `https://amoy.polygonscan.com` |

### "Node not authorised" on submitLocalUpdate

Your wallet has not been added by the admin. Ask the admin to authorize your address in the **Node Management** tab.

### Aggregation fails: "No client updates for round N"

No participants have submitted updates for the current round yet. Have at least one participant upload a local model before running aggregation.

### Port already in use

```bash
# Kill whatever is on port 4000
kill $(lsof -t -i:4000)

# Kill whatever is on port 5173
kill $(lsof -t -i:5173)
```

---

## Smart Contract

The `FedShieldCoordinator` contract on **Polygon Amoy** exposes:

```solidity
function registerGlobalModel(string _ipfsCID) external onlyOwner
function submitLocalUpdate(string _ipfsCID, string _metadata) external onlyAuthorizedNode
function addNode(address _node) external onlyOwner
function removeNode(address _node) external onlyOwner
function getCurrentRound() external view returns (uint256)
function getLatestModel() external view returns (string)
function getModelVersions() external view returns (ModelVersion[] memory)
function getClientUpdates(uint256 _round) external view returns (ClientUpdate[] memory)
```

Get test MATIC from the [Polygon Amoy faucet](https://faucet.polygon.technology).

---

## License

MIT
