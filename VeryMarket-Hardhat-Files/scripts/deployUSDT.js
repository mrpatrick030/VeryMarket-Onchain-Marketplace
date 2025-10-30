const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying USDT with owner:", deployer.address);

  const HederaToken = await hre.ethers.getContractFactory("HederaUSDT");
  const hederaToken = await HederaToken.deploy();
  await hederaToken.waitForDeployment();
  const address = await hederaToken.getAddress();

  console.log("USDT deployed to:", address);
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});


// deployment code
// npx hardhat run scripts/deployUSDT.js --network hederaTestnet
