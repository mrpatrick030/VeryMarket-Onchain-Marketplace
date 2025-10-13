require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const { PRIVATE_KEY, SEPOLIA_RPC_URL, HEDERA_RPC_URL, SWELL_RPC_URL } = process.env;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepoliaTestnet: {
      url: "https://sepolia.rpc.thirdweb.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainid:11155111
    },
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainid:296
    },
    swellTestnet: { 
      url: "https://swell-testnet.alt.technology",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainid:1952959483
    },
  },
};
