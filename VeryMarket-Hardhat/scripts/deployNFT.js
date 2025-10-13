const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ReceiptNFT with owner:", deployer.address);

  const ReceiptNFT = await hre.ethers.getContractFactory("ReceiptNFT");
  const receiptNFT = await ReceiptNFT.deploy("0x0a7e3660A00A28651821C048351aabcdDbf0a1B1", deployer.address);
  await receiptNFT.waitForDeployment();
  const address = await receiptNFT.getAddress();

  console.log("ReceiptNFT deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// deployment code
// npx hardhat run scripts/deployNFT.js --network swellTestnet
