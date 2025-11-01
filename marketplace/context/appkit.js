"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, hederaTestnet } from "@reown/appkit/networks";

// 1. Get projectId at https://dashboard.reown.com
const projectId = "c7a73a60060fab01303446d395de2614";

// 2. Create a metadata object
const metadata = {
  name: 'VeryMarket',
  description: 'On-chain Marketplace',
  url: 'https:verymarket.vercel.app',
  icons: ['https://supposed-emerald-snake.myfilebase.com/ipfs/QmeQZU2iPQXAZA1hVoEd1oniznrYmakxAL4Mc8guZmWCQC']
}

// 3. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: [mainnet, hederaTestnet],
  projectId,
  features: {
    analytics: true,
  },
  themeMode: "dark",
      themeVariables: {
    "--w3m-accent":"#fff",
    "--w3m-font-family":"sans-serif",
    "--w3m-z-index": 9999,
    "--w3m-color-mix": "#234",
    "--w3m-color-mix-strength": 20,
    "--w3m-border-radius-master": "10px"
  },
    chainImages: {
    296: 'https://supposed-emerald-snake.myfilebase.com/ipfs/QmThU47Qaw4DaevhNZg4v6fJqZ2FQ8XCR9LZjbaQqfe7xc'
  }
});

export function AppKit({children}) {
  return (
    children
  );
}