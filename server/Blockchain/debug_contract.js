require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const abi = require("./contract_abi.json");

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const contractAddr = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(contractAddr, abi, provider);

async function main() {
    console.log("Contract:", contractAddr);
    console.log("RPC:", rpcUrl);

    const round = await contract.currentRound();
    console.log("\nCurrent round:", round.toString());

    for (let r = 0; r <= Number(round); r++) {
        const count = await contract.getClientUpdateCount(r);
        console.log("Round " + r + ": " + count.toString() + " updates");
        if (Number(count) > 0) {
            const updates = await contract.getClientUpdatesForRound(r);
            updates.forEach((u, i) => {
                console.log("  [" + i + "] node=" + u.nodeAddress + " cid=" + u.ipfsCID + " meta=" + u.metadata);
            });
        }
    }

    const versions = await contract.getAllModelVersions();
    console.log("\nModel versions:", versions.length);

    const owner = await contract.owner();
    console.log("Contract owner:", owner);
}

main().catch(console.error);

async function checkAuth() {
    // Check some known addresses
    const addrs = [
        "0x8467cF93749036236d722d55ac1E3247B2ffc9f1",
        "0xbB778dfD27Cc383a08869F419Ff27a3A8Ad06eAd",
        "0x4B2346bA52B2C60914F5b0cdb3ACA832982f6D8b"
    ];
    for (const a of addrs) {
        const isAuth = await contract.authorizedNodes(a);
        console.log("Authorized? " + a + " => " + isAuth);
    }
}
checkAuth().catch(console.error);
