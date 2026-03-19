require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const abi = require("./contract_abi.json");

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
const contractAddr = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddr, abi, provider);

async function main() {
    console.log("Contract:", contractAddr);
    console.log("Polygonscan URL: https://amoy.polygonscan.com/address/" + contractAddr);
    console.log("");

    // Get the latest block
    const latestBlock = await provider.getBlockNumber();
    // Search last 10000 blocks for events
    const fromBlock = Math.max(0, latestBlock - 10000);

    console.log("Scanning blocks", fromBlock, "to", latestBlock, "for events...\n");

    // Check for ClientUpdateSubmitted events
    const clientFilter = contract.filters.ClientUpdateSubmitted();
    const clientEvents = await contract.queryFilter(clientFilter, fromBlock, latestBlock);
    console.log("=== ClientUpdateSubmitted events: " + clientEvents.length + " ===");
    clientEvents.forEach((e, i) => {
        console.log("  [" + i + "] tx=" + e.transactionHash);
        console.log("       node=" + e.args.node + " round=" + e.args.round.toString());
        console.log("       cid=" + e.args.ipfsCID);
    });

    // Check for GlobalModelUpdated events
    const modelFilter = contract.filters.GlobalModelUpdated();
    const modelEvents = await contract.queryFilter(modelFilter, fromBlock, latestBlock);
    console.log("\n=== GlobalModelUpdated events: " + modelEvents.length + " ===");
    modelEvents.forEach((e, i) => {
        console.log("  [" + i + "] tx=" + e.transactionHash);
        console.log("       version=" + e.args.version.toString() + " round=" + e.args.round.toString());
        console.log("       cid=" + e.args.ipfsCID);
    });

    // Check NodeAuthorized events
    const nodeFilter = contract.filters.NodeAuthorized();
    const nodeEvents = await contract.queryFilter(nodeFilter, fromBlock, latestBlock);
    console.log("\n=== NodeAuthorized events: " + nodeEvents.length + " ===");
    nodeEvents.forEach((e, i) => {
        console.log("  [" + i + "] tx=" + e.transactionHash + " node=" + e.args.node);
    });
}

main().catch(console.error);
