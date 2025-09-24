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

// Token metadata
const TOKEN_LOGOS = {
  "0xA85C486c0e57267c954064Fd500077BDEdFa6704": { logo: "/images/usdc.png", name: "USDC" },
  "0x4d54Ac4Df9304E305338fF35272367aD21c0a7dE": { logo: "/images/tether.png", name: "USDT" },
  "0xCbE7063E2B5B5B4f574A9748354B6B076516a536": { logo: "/images/dai.png", name: "DAI" },
  "0x0000000000000000000000000000000000000000": { logo: "/images/eth.png", name: "ETH" },
};

// Match the contract enum
const STATUS = [
  "None",
  "Requested",
  "ShippingSet",
  "Escrowed",
  "Shipped",
  "Disputed",
  "Refunded",
  "Released",
];

export default function Dashboard() {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();

  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [owner, setOwner] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
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
      console.error(err);
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
      console.error(err);
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
      console.error("Error loading tokens:", err);
    }
  }

  // ----------- Act on Orders -----------
  async function act(orderId, fn, buyerPercent) {
    if (!walletProvider) return alert("Connect wallet first");
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    try {
      setLoading(true);
      let tx;
      if (fn === "resolveDispute") {
        const payoutToSeller = 0; // Adjust logic for buyerPercent if needed
        tx = await contract.resolveDispute(orderId, buyerPercent, payoutToSeller);
      } else {
        tx = await contract[fn](orderId);
      }
      await tx.wait();
      pushToast(`✅ Action '${fn}' executed for Order #${orderId}`);
      loadOrders();
    } catch (err) {
      console.error(err);
      pushToast(`❌ Action failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
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
      />

      {/* Toast notifications */}
      <div className="relative">
        <div className="absolute top-0 right-0 flex flex-col gap-2 z-50">
          {toasts.map((t) => (
            <div key={t.id} className={`px-4 py-2 rounded shadow-lg text-white animate-fadeIn ${t.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      {activeTab === "orders" && <OrdersTab orders={orders} address={address} act={act} TOKEN_LOGOS={TOKEN_LOGOS} STATUS={STATUS} />}
      {activeTab === "listings" && <ListingsTab listings={listings} pushToast={pushToast} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />}
      {activeTab === "create" && <CreateListingTab walletProvider={walletProvider} pushToast={pushToast} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />}
      {activeTab === "disputes" && isAdmin && <DisputesTab orders={orders} act={act} TOKEN_LOGOS={TOKEN_LOGOS} />}
    </div>
  );
}