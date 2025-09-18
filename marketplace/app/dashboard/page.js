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

const TOKEN_LOGOS = {
  "0x0000000000000000000000000000000000000002": { logo: "images/tether.png", name: "USDT" },
  "0x0000000000000000000000000000000000000001": { logo: "/images/dai.png", name: "DAI" },
  "0x0000000000000000000000000000000000000000": {logo: "images/eth.png", name: "ETH" }
};

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

  const STATUS = [
    "None",
    "Escrowed",
    "Shipped",
    "Disputed",
    "Refunded",
    "Released",
  ];
  const isAdmin = address?.toLowerCase() === owner;

  async function loadOrders() {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(
      MARKETPLACE_ADDRESS,
      MARKETPLACE_ABI,
      provider
    );

    try {
      const count = Number(await contract.orderCount());
      const arr = [];
      for (let i = 1; i <= count; i++) {
        const o = await contract.getOrder(i);
        arr.push({ id: i, ...o });
      }
      setOrders(arr.reverse());

      const contractOwner = await contract.owner();
      setOwner(contractOwner.toLowerCase());
    } catch (err) {
      console.error(err);
    }
  }

  async function loadListings() {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(
      MARKETPLACE_ADDRESS,
      MARKETPLACE_ABI,
      provider
    );

    try {
      const count = Number(await contract.listingCount());
      const arr = [];
      for (let i = 1; i <= count; i++) {
        const l = await contract.getListing(i);
        arr.push({ id: i, ...l });
      }
      setListings(arr.reverse());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!isConnected) return;
    loadOrders();
    loadListings();
    const interval = setInterval(() => {
      loadOrders();
      loadListings();
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  function pushToast(message, type = "info") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000
    );
  }

  async function act(orderId, fn, buyerPercent) {
    if (!walletProvider) return alert("Connect wallet first");
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    try {
      setLoading(true);
      let tx;
      if (fn === "resolveDispute") {
        tx = await contract.resolveDispute(orderId, buyerPercent);
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

  return (
    <div
      className={
        darkMode
          ? "p-6 max-w-6xl mx-auto bg-gray-900 text-gray-200 min-h-screen"
          : "p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen"
      }
    >
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* toasts map */}
      <div className="relative">
        <div className="absolute top-0 right-0 flex flex-col gap-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded shadow-lg text-white animate-fadeIn ${
                t.type === "error" ? "bg-red-600" : "bg-green-600"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === "orders" && (
        <OrdersTab
          orders={orders}
          address={address}
          act={act}
          TOKEN_LOGOS={TOKEN_LOGOS}
          STATUS={STATUS}
        />
      )}
      {activeTab === "listings" && (
        <ListingsTab listings={listings} TOKEN_LOGOS={TOKEN_LOGOS} />
      )}
      {activeTab === "create" && (
        <CreateListingTab
          walletProvider={walletProvider}
          pushToast={pushToast}
          TOKEN_LOGOS={TOKEN_LOGOS}
          darkMode={darkMode}
        />
      )}
      {activeTab === "disputes" && isAdmin && (
        <DisputesTab orders={orders} act={act} TOKEN_LOGOS={TOKEN_LOGOS} />
      )}
    </div>
  );
}
