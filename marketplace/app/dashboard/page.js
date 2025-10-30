"use client";
import { useState, useEffect } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract } from "ethers";

import Navbar from "@/components/Navbar";
import OrdersTab from "./OrdersTab";
import ListingsTab from "./ListingsTab";
import CreateListingTab from "./CreateListingTab";
import DisputesTab from "./DisputesTab";

import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import AnalyticsTab from "./AnalyticsTab";

// Token metadata
const TOKEN_LOGOS = {
  "0x0a7e3660A00A28651821C048351aabcdDbf0a1B1": { logo: "/images/usdc.png", name: "USDC" },
  "0xAB64c8c61A489C0f598A35a253E70875083Ea602": { logo: "/images/tether.png", name: "USDT" },
  "0x11e07C5C1FD74731e4567cF40FF59eE169F5301c": { logo: "/images/dai.png", name: "DAI" },
  // "0x0000000000000000000000000000000000000000": { logo: "/images/hbar.png", name: "HBAR" },
};
 
// Matching the contract enum
const STATUS = [
  "None",
  "Requested",
  "ShippingSet",
  "Escrowed",
  "Shipped", 
  "Disputed",
  "Refunded",
  "Released",
  "Cancelled",
  "DisputeResolved"
];

export default function Dashboard() {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();

  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [owner, setOwner] = useState("");
  const [activeTab, setActiveTab] = useState("listings");
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [tokens, setTokens] = useState({});

  const isAdmin = address?.toLowerCase() === owner;

  // ----------- Load Orders -----------
  async function loadOrders() {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    try {
      const ordersArr = await contract.getOrdersForUser(address);
      const formatted = ordersArr.map((o, i) => ({
        id: i + 1,
        ...o,
        status: STATUS[o.status], // convert enum
        createdAt: new Date(Number(o.createdAt) * 1000).toLocaleString(),
      }));
      setOrders(formatted.reverse());

      const contractOwner = await contract.owner();
      setOwner(contractOwner.toLowerCase());
    } catch (err) {
      console.log(err);
    }
  }

  // ----------- Load Listings -----------
  async function loadListings() {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    try {
      const allListings = await contract.getAllListings();
      const formatted = allListings.map((l, i) => ({ id: i + 1, ...l }));
      setListings(formatted.reverse());
    } catch (err) {
      console.log(err);
    }
  }

  // ----------- Load Tokens -----------
  async function loadTokens() {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    try {
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
      console.log("Error loading tokens:", err);
    }
  }

  // ----------- Toasts -----------
  function pushToast(message, type = "info") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  // ----------- useEffect -----------
  useEffect(() => {
    if (!isConnected) return;
    loadOrders();
    loadListings();
    loadTokens();

    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    contract.on("TokenApproved", (token, approved) => {
      setTokens((prev) => ({
        ...prev,
        [token]: { ...TOKEN_LOGOS[token], approved },
      }));
      pushToast(`${TOKEN_LOGOS[token]?.name || "Token"} approval set to ${approved}`);
    });

    const interval = setInterval(() => {
      loadOrders();
      loadListings();
      loadTokens();
    }, 30000);

    return () => {
      clearInterval(interval);
      contract.removeAllListeners("TokenApproved");
    };
  }, [isConnected]);

  return (
    <div className={darkMode ? "p-6 max-w-7xl mx-auto bg-gray-900 text-gray-200 min-h-screen" : "p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen"}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        TOKEN_LOGOS={TOKEN_LOGOS}
      />

      {/* Toast notifications */}
      <div className="relative">
        <div className="absolute top-0 right-0 flex flex-col gap-2 z-200">
          {toasts.map((t) => (
            <div key={t.id} className={`px-4 py-2 rounded shadow-lg text-white animate-fadeIn ${t.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      {activeTab === "analytics" && <AnalyticsTab pushToast={pushToast} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />}
      {activeTab === "orders" && <OrdersTab TOKEN_LOGOS={TOKEN_LOGOS} STATUS={STATUS} darkMode={darkMode} />}
      {activeTab === "listings" && <ListingsTab listings={listings} pushToast={pushToast} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />}
      {activeTab === "create" && <CreateListingTab walletProvider={walletProvider} pushToast={pushToast} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />}
      {activeTab === "disputes" && isAdmin && <DisputesTab orders={orders} pushToast={pushToast} darkMode={darkMode} TOKEN_LOGOS={TOKEN_LOGOS} />}
    </div>
  );
}