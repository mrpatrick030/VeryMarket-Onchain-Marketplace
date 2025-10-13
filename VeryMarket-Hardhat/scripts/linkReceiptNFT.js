const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // deployed contract addresses
  const MARKETPLACE_ADDRESS = "0x0a7e3660A00A28651821C048351aabcdDbf0a1B1";
  const RECEIPT_NFT_ADDRESS = "0xAB64c8c61A489C0f598A35a253E70875083Ea602";

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
    console.error("❌ Error linking contracts:", error);
    process.exit(1);
  });