"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = '4ae4f912d4e7629aeeccff8fb3804be4'

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
}

const swellTestnet = {
  chainId: 1924,
  name: 'Swell Testnet',
  currency: 'ETH',
  explorerUrl: 'https://swell-testnet-explorer.alt.technology',
  rpcUrl: 'https://rpc.ankr.com/swell_sepolia'
}

// 3. Create a metadata object
const metadata = {
  name: 'Very Market',
  description: 'Decentralized Marketplace',
  url: 'localhost:3000', // origin must match domain & subdomain
  icons: ['https://supposed-emerald-snake.myfilebase.com/ipfs/QmWDKfLRmyCiEU88K1s1yYxSp4z1DPGcCfVp2hW67wKMsg']
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
  chains: [mainnet, swellTestnet],
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
  enableOnramp: true, // Optional - false as default
  themeVariables: {
    '--w3m-z-index': 9999,
    '--w3m-accent': '#00f'
  },
  defaultChain: mainnet,
  chainImages: {
    1924: 'https://supposed-emerald-snake.myfilebase.com/ipfs/QmSX8NnaEdZz8EBd82KoHu6xsqpFa2aZfzQVa9XBhJW5fZ'
  }
})

export function Web3Modal({ children }) {
  return children
}

export function prettyTx(hash) {
  return `${swellTestnet.explorerUrl}/tx/${hash}`;
}




