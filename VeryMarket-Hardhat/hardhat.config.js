require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const { PRIVATE_KEY, HEDERA_RPC_URL, SWELL_RPC_URL } = process.env;

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
    hederaTestnet: {
      url: HEDERA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    swellTestnet: {
      url: SWELL_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
