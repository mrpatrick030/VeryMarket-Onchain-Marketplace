"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = 'c7a73a60060fab01303446d395de2614'

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
}

const hederaTestnet = {
  chainId: 296,
  name: 'Hedera Testnet',
  currency: 'HBAR',
  explorerUrl: 'https://hashscan.io/testnet/home',
  rpcUrl: 'https://testnet.hashio.io/api'
}

// 3. Create a metadata object
const metadata = {
  name: 'VeryMarket',
  description: 'Decentralized Marketplace',
  url: 'https://localhost:3000', // origin must match domain & subdomain
  icons: ['https://supposed-emerald-snake.myfilebase.com/ipfs/QmeQZU2iPQXAZA1hVoEd1oniznrYmakxAL4Mc8guZmWCQC']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,

  /*Optional*/
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: false, // true by default
  rpcUrl: '...', // used for the Coinbase SDK
  defaultChainId: 1, // used for the Coinbase SDK
  enableEmail: true
})

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [mainnet, hederaTestnet],
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
  enableOnramp: true, // Optional - false as default
  themeVariables: {
    '--w3m-z-index': 9999,
    '--w3m-accent': '#234'
  },
  defaultChain: mainnet,
  chainImages: {
    296: 'https://supposed-emerald-snake.myfilebase.com/ipfs/QmThU47Qaw4DaevhNZg4v6fJqZ2FQ8XCR9LZjbaQqfe7xc'
  }
})

export function Web3Modal({ children }) {
  return children
}




