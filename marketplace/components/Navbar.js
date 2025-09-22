"use client";
import React, { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from '@web3modal/ethers/react';
import { BrowserProvider, Contract } from 'ethers';
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../lib/contract";

// Token metadata
const TOKEN_LOGOS = {
  "0x4d54Ac4Df9304E305338fF35272367aD21c0a7dE": { logo: "/images/tether.png", name: "USDT" },
  "0xCbE7063E2B5B5B4f574A9748354B6B076516a536": { logo: "/images/dai.png", name: "DAI" },
  "0x0000000000000000000000000000000000000000": { logo: "/images/eth.png", name: "ETH" },
};

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokens, setTokens] = useState({});

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!isConnected || !address) return;
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        const owner = await contract.owner();
        const mediator = await contract.mediator();
        const lowerAddr = address.toLowerCase();
        setIsAdmin(lowerAddr === owner.toLowerCase() || lowerAddr === mediator.toLowerCase());
      } catch (err) {
        console.error("Failed to fetch admin info:", err);
      }
    }
    checkAdmin();
  }, [isConnected, address]);

  // Load approved tokens
  useEffect(() => {
    if (!walletProvider) return;
    async function loadTokens() {
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        const approvedList = await contract.getApprovedTokens();
        const updatedTokens = {};
        for (const [addr, meta] of Object.entries(TOKEN_LOGOS)) {
          updatedTokens[addr] = {
            ...meta,
            approved: addr === "0x0000000000000000000000000000000000000000" || approvedList.includes(addr),
          };
        }
        setTokens(updatedTokens);
      } catch (err) {
        console.error("Error loading tokens:", err);
      }
    }
    loadTokens();
  }, [walletProvider]);

  return (
    <nav className={`bg-white dark:bg-gray-800 shadow rounded-xl p-4 mb-6 flex flex-wrap gap-2 justify-between items-center`}>

      {/* Left: Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-3 py-1 cursor-pointer rounded ${activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Orders
        </button>

        <button
          onClick={() => setActiveTab("listings")}
          className={`px-3 py-1 cursor-pointer rounded ${activeTab === "listings" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Listings
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`px-3 py-1 cursor-pointer rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Create Listing
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("disputes")}
            className={`px-3 py-1 cursor-pointer rounded ${activeTab === "disputes" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
          >
            Disputes
          </button>
        )}
      </div>

      {/* Right: Wallet, Dark mode, and Approved Tokens */}
      <div className="flex items-center gap-4">
        {/* Approved Tokens */}
        <div className="flex items-center gap-2">
          {Object.entries(tokens).map(([addr, token]) => (
            <div key={addr} className="relative flex items-center gap-1">
              <img src={token.logo} alt={token.name} className="w-7 h-7 bg-[#fff] p-[0.1cm] rounded-full object-contain" title={`${token.name} ${token.approved ? "✅ Approved" : "❌ Not Approved"}`} />
              {token.approved && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
          ))}
        </div>

        {/* Wallet connect */}
        <w3m-button />

        {/* Dark mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1 rounded cursor-pointer bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
        >
          {darkMode ? "Dark" : "Light"}
        </button>
      </div>
    </nav>
  );
}