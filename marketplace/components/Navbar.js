"use client";
import React, { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../lib/contract";
import { Sun, Moon } from "lucide-react";

const TOKEN_LOGOS = {
  "0xA85C486c0e57267c954064Fd500077BDEdFa6704": { logo: "/images/usdc.png", name: "USDC" },
  "0x4d54Ac4Df9304E305338fF35272367aD21c0a7dE": { logo: "/images/tether.png", name: "USDT" },
  "0xCbE7063E2B5B5B4f574A9748354B6B076516a536": { logo: "/images/dai.png", name: "DAI" },
  "0x0000000000000000000000000000000000000000": { logo: "/images/eth.png", name: "ETH" },
};

export default function Navbar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokens, setTokens] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggleSpin, setToggleSpin] = useState(false);

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

  // Handle dark/light toggle spin
  const handleToggle = () => {
    setToggleSpin(true);
    setDarkMode(!darkMode);
    setTimeout(() => setToggleSpin(false), 500); // reset spin after animation
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow rounded-xl p-4 mb-6">
      {/* Top Row */}
      <div className="flex justify-between items-center">
        <img src="images/VeryMarketLogo.png" alt="" width="130" className="inline-block" />

        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden py-1 px-3 rounded cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {menuOpen ? "✖" : "☰"}
        </button>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Tabs */}
          <div className="flex gap-2">
            {["orders", "listings", "create"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded cursor-pointer ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("disputes")}
                className={`px-3 py-1 rounded cursor-pointer ${
                  activeTab === "disputes"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Disputes
              </button>
            )}
          </div>

          {/* Tokens */}
          <div className="flex items-center gap-2">
            {Object.entries(tokens).map(([addr, token]) => (
              <div key={addr} className="relative flex items-center gap-1">
                <img
                  src={token.logo}
                  alt={token.name}
                  className="w-6 h-6 bg-[#fff] p-[0.1cm] rounded-full object-contain"
                  title={`${token.name} ${token.approved ? "✅ Approved" : "❌ Not Approved"}`}
                />
                {token.approved && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
            ))}
          </div>

          {/* Wallet + Dark mode */}
          <w3m-button />
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-3 py-1 cursor-pointer bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 transform transition-transform duration-500 ${
              toggleSpin ? "animate-rotate360" : ""
            }`}
          >
            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {darkMode ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown with slide animation */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden lg:hidden ${
          menuOpen ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Tabs */}
          <div className="flex flex-col gap-2">
            {["orders", "listings", "create"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMenuOpen(false);
                }}
                className={`px-3 py-2 rounded cursor-pointer text-left ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab("disputes");
                  setMenuOpen(false);
                }}
                className={`px-3 py-2 rounded cursor-pointer text-left ${
                  activeTab === "disputes"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Disputes
              </button>
            )}
          </div>

          {/* Tokens */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(tokens).map(([addr, token]) => (
              <div key={addr} className="relative">
                <img
                  src={token.logo}
                  alt={token.name}
                  className="w-6 h-6 bg-[#fff] p-[0.1cm] rounded-full object-contain"
                  title={`${token.name} ${token.approved ? "✅ Approved" : "❌ Not Approved"}`}
                />
                {token.approved && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
            ))}
          </div>

          {/* Wallet + Dark mode */}
          <w3m-button />
<button
  onClick={handleToggle}
  className={`flex items-center justify-center gap-2 px-3 py-2 cursor-pointer bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 transform transition-transform duration-500 ${
    toggleSpin ? "animate-rotate360" : ""
  }`}
>
  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
  <span className="flex items-center">{darkMode ? "Dark" : "Light"}</span>
</button>

        </div>
      </div>
    </nav>
  );
}
