const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ReceiptNFT with owner:", deployer.address);

  const ReceiptNFT = await hre.ethers.getContractFactory("ReceiptNFT");
  const receiptNFT = await ReceiptNFT.deploy("0xF410e3a0abC755e86f098241e9E18EdB66eE6CB5", deployer.address);
  await receiptNFT.waitForDeployment();
  const address = await receiptNFT.getAddress();

  console.log("ReceiptNFT deployed to:", address);
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});


// deployment code
// npx hardhat run scripts/deployNFT.js --network hederaTestnet
