"use client";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../lib/contract";

export default function Home() {
  const { walletProvider } = useWeb3ModalProvider();
  const { address } = useWeb3ModalAccount();
  const router = useRouter();

  const [stats, setStats] = useState({
    listings: 0,
    orders: 0,
    disputes: [],
  });

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      if (!walletProvider) return;
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

        const listings = await contract.listingCount();
        const orders = await contract.orderCount();

        const fetched = [];
        for (let i = 0; i < orders; i++) {
          const anyOrder = await contract.orders(i);
          if (Number(anyOrder.status) === 3) {
            fetched.push(anyOrder);
          }
        }

        setStats({
          listings: Number(listings),
          orders: Number(orders),
          disputes: [fetched],
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }
    fetchStats();
  }, [walletProvider]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* 🎨 Animated Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed animate-zoom"
        style={{
          backgroundImage:
            "url(/images/bg7.jpg)",
        }}
      ></div>
      <div className="absolute inset-0 bg-black/50 z-0"></div>

      {/* 🎉 Floating shopping icons */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <span className="floating-icon">🛒</span>
        <span className="floating-icon delay-200">🛍️</span>
        <span className="floating-icon delay-400">💳</span>
        <span className="floating-icon delay-600">📦</span>
      </div>

      <Navbar />

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg animate-fadeIn">
          Welcome to <span className="text-yellow-300">VeryMarket</span>
        </h1>
 
        <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl">
          A decentralized marketplace powered by the Hedera Network. Buy, sell, and manage
          your assets seamlessly on-chain.
        </p>

        <div className="my-8 flex gap-4 animate-slideUp delay-400">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-yellow-400 cursor-pointer hover:bg-yellow-300 text-black font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 hover:scale-105"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push("/about")}
            className="px-6 py-3 border-2 border-white text-white cursor-pointer font-semibold rounded-xl shadow-lg hover:bg-white hover:text-black transition-all transform hover:-translate-y-1 hover:scale-105"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md py-12 px-6">
        <h2 className="text-center text-2xl font-bold text-white mb-8 animate-fadeIn">
          Marketplace Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-200">
            <h3 className="text-4xl font-bold text-white">{stats.listings}</h3>
            <p className="mt-2 text-white/90">Total Listings</p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-400">
            <h3 className="text-4xl font-bold text-white">{stats.orders}</h3>
            <p className="mt-2 text-white/90">Active Orders</p>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-red-400 to-red-600 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-600">
            <h3 className="text-4xl font-bold text-white">{stats.disputes.length}</h3>
            <p className="mt-2 text-white/90">Disputed Orders</p>
          </div>
        </div>
      </div>

    </div>
  );
}
