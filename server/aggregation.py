"""
aggregation.py
═══════════════════════════════════════════════════════════════════════
Federated Learning – Server-Side Aggregation Script
═══════════════════════════════════════════════════════════════════════

Flow (run as admin / contract owner):
  1. Query the Blockchain API server (localhost:4000) using admin access:
       - GET /api/current-round      → active round number
       - GET /api/latest-model       → latest global model CID
       - GET /api/client-updates/<round> → list of client update CIDs
  2. Download each model (client + global base) from IPFS via Pinata gateway.
  3. Perform FedAvg aggregation on the downloaded histogram data.
  4. Upload the aggregated global model to IPFS and register it on-chain
     via POST /api/upload-and-register  (admin wallet signs the tx).

Usage:
  python aggregation.py
  python aggregation.py --round 3          # aggregate a specific round
  python aggregation.py --api http://localhost:4000
"""

import os
import sys
import glob
import json
import tempfile
import argparse
import requests
import numpy as np
import xgboost as xgb
from pathlib import Path
from collections import defaultdict

# ── Configuration ──────────────────────────────────────────────────────────────
BLOCKCHAIN_API = os.getenv("BLOCKCHAIN_API", "http://localhost:4000")
IPFS_GATEWAY   = os.getenv("IPFS_GATEWAY",   "https://gateway.pinata.cloud/ipfs")
MODEL_DIR      = os.getenv("MODEL_DIR",       os.path.join(os.path.dirname(__file__), "model"))

REQUEST_TIMEOUT = 30   # seconds per HTTP request
DOWNLOAD_TIMEOUT = 120  # seconds for IPFS downloads (can be slow)

# ── Pretty helpers ─────────────────────────────────────────────────────────────

def _sep(char="═", width=70):
    print(char * width)

def _header(title):
    _sep()
    print(f"  {title}")
    _sep()

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 – Blockchain API helpers  (admin read access, no private key needed)
# ══════════════════════════════════════════════════════════════════════════════

def get_current_round(api_base: str) -> int:
    """Fetch the active round number from the on-chain contract."""
    url = f"{api_base}/api/current-round"
    print(f"🔗 GET {url}")
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    # server returns { round: <number> }  or  { currentRound: <number> }
    round_val = data.get("round") or data.get("currentRound") or data.get("data")
    if round_val is None:
        raise ValueError(f"Unexpected response from /api/current-round: {data}")
    return int(round_val)


def get_latest_global_model_cid(api_base: str) -> str | None:
    """Fetch the latest global model CID recorded on-chain."""
    url = f"{api_base}/api/latest-model"
    print(f"🔗 GET {url}")
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    if resp.status_code == 200:
        data = resp.json()
        cid = data.get("cid") or data.get("ipfsCID") or data.get("data")
        return str(cid) if cid else None
    if resp.status_code == 500:
        # "No model recorded yet" → first round
        return None
    resp.raise_for_status()


def get_client_updates_for_round(api_base: str, round_num: int) -> list[dict]:
    """
    Fetch all client update records for the given round.
    Each record has at least: nodeAddress, ipfsCID, timestamp, metadata.
    """
    url = f"{api_base}/api/client-updates/{round_num}"
    print(f"🔗 GET {url}")
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    # server returns { updates: [...] }  or  a raw list
    if isinstance(data, list):
        return data
    return data.get("updates") or data.get("data") or []


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 – IPFS download helpers
# ══════════════════════════════════════════════════════════════════════════════

def download_from_ipfs(cid: str, dest_path: str, gateway: str = IPFS_GATEWAY):
    """Download a file from IPFS and save it to dest_path."""
    url = f"{gateway}/{cid}"
    print(f"   📥 Downloading CID {cid[:20]}… → {os.path.basename(dest_path)}")
    resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT, stream=True)
    resp.raise_for_status()
    with open(dest_path, "wb") as fh:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            fh.write(chunk)
    print(f"      ✅ Saved ({os.path.getsize(dest_path):,} bytes)")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 – Aggregation logic (FedAvg over histogram data)
# ══════════════════════════════════════════════════════════════════════════════

def aggregate_histograms_fedavg(client_json_paths: list[str]) -> dict:
    """
    Aggregate histogram JSON files from multiple clients using FedAvg.
    Expects each file to have: { num_samples, histograms: { feature: { bin: {G, H} } } }
    Returns the aggregated dictionary.
    """
    _header("📊 FEDAVG HISTOGRAM AGGREGATION")

    client_data = []
    total_samples = 0

    for path in client_json_paths:
        try:
            with open(path) as fh:
                data = json.load(fh)
            ns = data.get("num_samples", 0)
            if ns == 0:
                print(f"   ⚠️  Skipping {os.path.basename(path)} – no num_samples")
                continue
            client_data.append(data)
            total_samples += ns
            print(f"   ✅ {os.path.basename(path)}  client={data.get('client_id','?')}  samples={ns}")
        except Exception as exc:
            print(f"   ⚠️  Could not load {path}: {exc}")

    if not client_data:
        raise ValueError("No valid client histogram data to aggregate.")

    print(f"\n   Total samples: {total_samples}")

    # Compute per-client weights
    weights = [d["num_samples"] / total_samples for d in client_data]
    for d, w in zip(client_data, weights):
        print(f"   Client {d.get('client_id','?')}: weight={w:.4f}")

    print("\n   🔄 Aggregating gradients and hessians…")

    agg = defaultdict(lambda: defaultdict(lambda: {"G": None, "H": None}))

    for data, _ in zip(client_data, weights):
        for feat, feat_hist in data.get("histograms", {}).items():
            for bin_name, bin_data in feat_hist.items():
                G = np.array(bin_data["G"])
                H = np.array(bin_data["H"])
                if agg[feat][bin_name]["G"] is None:
                    agg[feat][bin_name]["G"] = G.copy()
                    agg[feat][bin_name]["H"] = H.copy()
                else:
                    agg[feat][bin_name]["G"] += G
                    agg[feat][bin_name]["H"] += H

    # Convert numpy → list for JSON serialisation
    for feat in agg:
        for b in agg[feat]:
            agg[feat][b]["G"] = agg[feat][b]["G"].tolist()
            agg[feat][b]["H"] = agg[feat][b]["H"].tolist()

    output = {
        "aggregation_method": "FedAvg",
        "num_clients": len(client_data),
        "total_samples": total_samples,
        "client_weights": weights,
        "client_ids": [d.get("client_id", f"client_{i}") for i, d in enumerate(client_data, 1)],
        "histograms": dict(agg),
    }

    print(f"\n   ✅ Aggregated {len(client_data)} clients  |  {len(agg)} features")
    return output


def build_global_model(
    agg_histograms: dict,
    base_model_path: str | None,
    output_path: str,
) -> xgb.XGBClassifier:
    """
    Build (or update) the global XGBoost model.
    Currently uses the base model as the global model and records the aggregated
    histogram metadata alongside it.  In production you would rebuild trees from
    the gradient statistics.
    """
    _header("🌍 BUILDING GLOBAL MODEL")

    if base_model_path and os.path.exists(base_model_path):
        print(f"   📂 Loading base model: {base_model_path}")
        model = xgb.XGBClassifier()
        model.load_model(base_model_path)
        print("   ✅ Base model loaded")
    else:
        raise FileNotFoundError(
            f"Base model not found at: {base_model_path}\n"
            "   Provide a Central_model.json or set MODEL_DIR correctly."
        )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    model.save_model(output_path)
    print(f"   💾 Global model saved → {output_path}")

    # Also save the aggregated histogram metadata next to the model
    hist_path = output_path.replace(".json", "_histograms.json")
    with open(hist_path, "w") as fh:
        json.dump(agg_histograms, fh, indent=2)
    print(f"   💾 Aggregated histograms → {hist_path}")

    return model


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 – Upload aggregated model and register on-chain  (admin only)
# ══════════════════════════════════════════════════════════════════════════════

def upload_and_register_global_model(api_base: str, model_path: str) -> dict:
    """
    POST the aggregated model file to /api/upload-and-register.
    The blockchain server signs the updateGlobalModel() tx with the admin wallet.
    Returns the JSON response { cid, txHash, blockNumber, gateway, explorer }.
    """
    _header("🔗 UPLOADING & REGISTERING GLOBAL MODEL (ADMIN)")
    url = f"{api_base}/api/upload-and-register"
    print(f"   📤 POST {url}")
    print(f"   📁 File: {model_path}")

    with open(model_path, "rb") as fh:
        resp = requests.post(
            url,
            files={"model": (os.path.basename(model_path), fh, "application/json")},
            data={"pinName": f"fedshield_global_{int(__import__('time').time())}"},
            timeout=DOWNLOAD_TIMEOUT,
        )

    if not resp.ok:
        raise RuntimeError(
            f"upload-and-register failed [{resp.status_code}]: {resp.text[:500]}"
        )

    result = resp.json()
    print(f"   ✅ CID       : {result.get('cid')}")
    print(f"   ✅ Tx Hash   : {result.get('txHash')}")
    print(f"   ✅ Block     : {result.get('blockNumber')}")
    print(f"   🌐 Gateway   : {result.get('gateway')}")
    print(f"   🔍 Explorer  : {result.get('explorer')}")
    return result


# ══════════════════════════════════════════════════════════════════════════════
# Main orchestration
# ══════════════════════════════════════════════════════════════════════════════

def run_aggregation(api_base: str, target_round: int | None = None):
    """
    Full federated aggregation pipeline:
      fetch blockchain state → download IPFS models → aggregate → register.
    """
    _header("🚀 FEDERATED LEARNING AGGREGATION (ADMIN)")
    print(f"   Blockchain API : {api_base}")
    print(f"   IPFS Gateway   : {IPFS_GATEWAY}")
    print(f"   Model dir      : {MODEL_DIR}")

    # ── 1. Fetch blockchain state ──────────────────────────────────────────────
    print("\n📡 STEP 1 – Fetching blockchain state…")
    current_round = get_current_round(api_base)
    print(f"   Current round : {current_round}")

    # Determine the round to aggregate
    agg_round = target_round if target_round is not None else current_round
    print(f"   Aggregating round : {agg_round}")

    global_model_cid = get_latest_global_model_cid(api_base)
    if global_model_cid:
        print(f"   Global model CID  : {global_model_cid[:30]}…")
    else:
        print("   Global model CID  : (none – first round)")

    client_updates = get_client_updates_for_round(api_base, agg_round)
    print(f"   Client updates    : {len(client_updates)} for round {agg_round}")

    if not client_updates:
        print("\n⚠️  No client updates found for this round. Nothing to aggregate.")
        return None

    # ── 2. Download models from IPFS ──────────────────────────────────────────
    print("\n📥 STEP 2 – Downloading models from IPFS…")
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Download the current global model (as the base)
    base_model_path = os.path.join(MODEL_DIR, "Central_model.json")
    if global_model_cid:
        print(f"\n   📦 Global model (base):")
        download_from_ipfs(global_model_cid, base_model_path)
    else:
        # Check if a local base model exists
        if not os.path.exists(base_model_path):
            raise FileNotFoundError(
                f"No global model CID on-chain and no local base model at {base_model_path}. "
                "Cannot aggregate without a base model."
            )
        print(f"   ℹ️  Using local base model: {base_model_path}")

    # Download client histogram / model files
    client_paths = []
    print(f"\n   📦 Client updates ({len(client_updates)}):")
    for i, update in enumerate(client_updates, 1):
        cid = update.get("ipfsCID") or update.get("cid") or ""
        node = update.get("nodeAddress", f"client_{i}")
        meta = update.get("metadata", "")
        print(f"\n   [{i}] Node: {node}  |  CID: {cid[:20]}…  |  meta: {meta}")

        if not cid:
            print("       ⚠️  No CID – skipping")
            continue

        dest = os.path.join(MODEL_DIR, f"client_{i}_{cid[:8]}.json")
        try:
            download_from_ipfs(cid, dest)
            client_paths.append(dest)
        except Exception as exc:
            print(f"       ❌ Download failed: {exc}")

    if not client_paths:
        raise RuntimeError("All client downloads failed. Cannot aggregate.")

    # ── 3. Aggregate ──────────────────────────────────────────────────────────
    print("\n⚙️  STEP 3 – Running FedAvg aggregation…")
    agg_histograms = aggregate_histograms_fedavg(client_paths)

    global_model_out = os.path.join(MODEL_DIR, "global_model.json")
    build_global_model(agg_histograms, base_model_path, global_model_out)

    # ── 4. Upload & register on-chain (admin) ─────────────────────────────────
    print("\n📤 STEP 4 – Uploading aggregated model & registering on-chain…")
    result = upload_and_register_global_model(api_base, global_model_out)

    # ── Summary ───────────────────────────────────────────────────────────────
    _sep("═")
    print("✅  AGGREGATION COMPLETE")
    _sep("═")
    print(f"   Round aggregated  : {agg_round}")
    print(f"   Clients included  : {agg_histograms['num_clients']}")
    print(f"   Total samples     : {agg_histograms['total_samples']}")
    print(f"   New global CID    : {result.get('cid')}")
    print(f"   Tx Hash           : {result.get('txHash')}")
    print(f"   Explorer          : {result.get('explorer')}")
    _sep("═")

    return result


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="FedShield – Admin Aggregation Script"
    )
    parser.add_argument(
        "--api",
        default=BLOCKCHAIN_API,
        help=f"Blockchain API base URL (default: {BLOCKCHAIN_API})",
    )
    parser.add_argument(
        "--round",
        type=int,
        default=None,
        help="Round number to aggregate (default: current round from contract)",
    )
    args = parser.parse_args()

    try:
        run_aggregation(api_base=args.api, target_round=args.round)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user.")
        sys.exit(1)
    except Exception as exc:
        print(f"\n❌ Aggregation failed: {exc}")
        sys.exit(1)