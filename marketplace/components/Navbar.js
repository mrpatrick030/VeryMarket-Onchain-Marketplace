"use client";
import React, { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from '@web3modal/ethers/react'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../lib/contract";

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
    // wallet connect settings
  const { walletProvider } = useWeb3ModalProvider()
  const { isConnected, chainId, address } = useWeb3ModalAccount();
  const [isAdmin, setIsAdmin] = useState("");

  // Check if user is admin (owner or mediator)
  useEffect(() => {

    async function checkAdmin() {
          if (isConnected) {
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
  }
    checkAdmin();
  }, [isConnected, address]);

  return (
    <nav className={`bg-white dark:bg-gray-800 shadow rounded-xl p-4 mb-6 flex flex-wrap gap-2 justify-between items-center`}>

      {/* Left: Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-3 py-1 rounded ${activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Orders
        </button>

        <button
          onClick={() => setActiveTab("listings")}
          className={`px-3 py-1 rounded ${activeTab === "listings" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Listings
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`px-3 py-1 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
        >
          Create Listing
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("disputes")}
            className={`px-3 py-1 rounded ${activeTab === "disputes" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
          >
            Disputes
          </button>
        )}
      </div>

      {/* Right: Wallet & Dark mode */}
      <div className="flex items-center gap-2">
       <w3m-button />

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
        >
          {darkMode ? "Dark" : "Light"}
        </button>
      </div>
    </nav>
  );
}
