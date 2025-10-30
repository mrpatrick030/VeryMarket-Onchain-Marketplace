const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying token with owner:", deployer.address);

  const HederaToken = await hre.ethers.getContractFactory("HederaDAI");
  const hederaToken = await HederaToken.deploy();
  await hederaToken.waitForDeployment();
  const address = await hederaToken.getAddress();

  console.log("DAI deployed to:", address);
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});


// deployment code
// npx hardhat run scripts/deployDAI.js --network hederaTestnet
