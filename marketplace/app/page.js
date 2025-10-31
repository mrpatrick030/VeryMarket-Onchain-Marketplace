"use client";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useWeb3ModalProvider,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../lib/contract";

export default function Home() {
  const { walletProvider } = useWeb3ModalProvider();
  const router = useRouter();

  const [stats, setStats] = useState({
    listings: 0,
    orders: 0,
    disputes: 0,
  });

  const [highlight, setHighlight] = useState({
    listings: false,
    orders: false,
    disputes: false,
  });

  // Auto redirect for connected users (after short delay)
  useEffect(() => {
    if (walletProvider) {
      const timer = setTimeout(() => router.push("/dashboard"), 300000); 
      return () => clearTimeout(timer);
    }
  }, [walletProvider, router]);

  // Fetch stats + subscribe to events
  useEffect(() => {
    if (!walletProvider) return;
    const provider = new BrowserProvider(walletProvider);
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    async function updateStats() {
      try {
        const listings = Number(await contract.listingCount());
        const orders = Number(await contract.orderCount());

        let disputes = 0;
        for (let i = 0; i < orders; i++) {
          const order = await contract.orders(i);
          if (Number(order.status) === 5) disputes++;
        }

        setHighlight({
          listings: listings !== stats.listings,
          orders: orders !== stats.orders,
          disputes: disputes !== stats.disputes,
        });

        setStats({ listings, orders, disputes });

        setTimeout(() => {
          setHighlight({ listings: false, orders: false, disputes: false });
        }, 1500);
      } catch (err) {
        console.log("Error fetching stats:", err);
      }
    }

    updateStats();

  }, [walletProvider, stats]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* bg */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed animate-zoom"
        style={{ backgroundImage: "url(/images/bg2.jpg)" }}
      />
      <div className="absolute inset-0 bg-black/40 z-0" />

     <div className="mt-[0.5cm] mb-[1cm] px-[1cm] flex justify-end">
      <w3m-Button />
     </div>

      {/* Intro */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center bg-[rgba(255,255,255,0.1)] backdrop-blur-md shadow-lg p-10 md:mx-[20%] mx-[5%] rounded-lg">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg animate-fadeIn">
          Welcome to <span className="text-gray-900">VeryMarket</span>
        </h1>
        <div className="mt-4 text-lg md:text-xl font-semibold text-gray-900 animate-fadeIn">
          E-commerce for the underbanked across Africa
        </div>
        <p className="mt-4 text-lg text-white/90 max-w-2xl animate-fadeIn">
          VeryMarket combines AI intelligence with the Hedera File Service (HFS), Hedera Smart Contract Service (HSCS), and Hedera Token Service (HTS), creating a decentralized marketplace where every transaction, order, listing, and asset is transparently verifiable and fully on-chain.
        </p>
        <div className="my-8 flex gap-4 animate-slideUp">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-gray-800 cursor-pointer hover:bg-gray-900 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 hover:scale-105"
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


      {/* Stats */}
      <div className="relative z-10 py-12 px-6">
        <h2
          className="text-center text-2xl font-bold text-white mb-8 animate-fadeIn"
          style={{ textShadow: "2px 2px 10px #fff" }}
        >
          Marketplace Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Listings */}
          <div
            className={`statCol p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 shadow-lg text-center transform transition ${
              highlight.listings
                ? "animate-pulse border-2 border-gray-200"
                : "hover:scale-105"
            }`}
          >
            <h3 className="text-4xl font-bold text-white">{stats.listings}</h3>
            <p className="mt-2 text-white/90">
              {stats.listings === 1 ? "Total Listing" : "Total Listings"}
            </p>
          </div>

          {/* Orders */}
          <div
            className={`statCol p-6 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg text-center transform transition ${
              highlight.orders
                ? "animate-pulse border-2 border-gray-200"
                : "hover:scale-105"
            }`}
          >
            <h3 className="text-4xl font-bold text-white">{stats.orders}</h3>
            <p className="mt-2 text-white/90">
              {stats.orders === 1 ? "Active Order" : "Active Orders"}
            </p>
          </div>

          {/* Disputes */}
          <div
            className={`statCol p-6 rounded-xl bg-gradient-to-br from-red-700 to-red-500 shadow-lg text-center transform transition ${
              highlight.disputes
                ? "animate-pulse border-2 border-gray-200"
                : "hover:scale-105"
            }`}
          >
            <h3 className="text-4xl font-bold text-white">{stats.disputes}</h3>
            <p className="mt-2 text-white/90">
              {stats.disputes === 1 ? "Disputed Order" : "Disputed Orders"}
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}