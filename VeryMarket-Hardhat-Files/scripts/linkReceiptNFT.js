const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // deployed contract addresses
  const MARKETPLACE_ADDRESS = "0xF410e3a0abC755e86f098241e9E18EdB66eE6CB5";
  const RECEIPT_NFT_ADDRESS = "0x6F3DC4A0389e3B7ecE795F9B9cEab88545EA13aA";

  console.log("Linking ReceiptNFT to Marketplace...");
  console.log("Deployer:", deployer.address);

  // Get Marketplace instance
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = Marketplace.attach(MARKETPLACE_ADDRESS);

  // Call setReceiptNFT
  const tx = await marketplace.setReceiptNFT(RECEIPT_NFT_ADDRESS);
  await tx.wait();

  console.log(`✅ ReceiptNFT successfully linked!`);
  console.log(`Marketplace: ${MARKETPLACE_ADDRESS}`);
  console.log(`ReceiptNFT: ${RECEIPT_NFT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.log("❌ Error linking contracts:", error);
    process.exit(1);
  });

  // npx hardhat run scripts/linkReceiptNFT.js --network hederaTestnet