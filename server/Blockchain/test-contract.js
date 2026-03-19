require("dotenv").config();
const { ethers } = require("ethers");
const contractAbi = require("./contract_abi.json");
const rpcUrl = "https://rpc-amoy.polygon.technology";
const contractAddr = "0xA034481143fbda4C2a2823b746Ea04684A14BD7a";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddr, contractAbi, provider);

async function main() {
    const round = await contract.currentRound();
    console.log("Current round:", round.toString());
    const count = await contract.getClientUpdateCount(round);
    console.log("Update count for round", round.toString(), ":", count.toString());
    const updates = await contract.getClientUpdatesForRound(round);
    console.log("Updates:", updates.map(u => u.ipfsCID));
}
main().catch(console.error);
