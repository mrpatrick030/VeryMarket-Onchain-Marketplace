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
        console.error("Error fetching stats:", err);
      }
    }

    updateStats();

    // Real-time event listeners
    contract.on("ListingCreated", updateStats);
    contract.on("OrderRequested", updateStats);
    contract.on("DisputeOpened", updateStats);
    contract.on("DisputeResolved", updateStats);

    return () => {
      contract.removeAllListeners();
    };
  }, [walletProvider, stats]);

  // countdown
  const [count, setCount] = useState(30);
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  const [allowAutoNav, setAllowAutoNav] = useState(true);
  useEffect(() => {
    const autoNav =
      allowAutoNav &&
      setTimeout(() => {
        router.push("/dashboard");
      }, 31000);

    return () => clearTimeout(autoNav);
  }, [allowAutoNav, router]);

  const stopNav = () => setAllowAutoNav(false);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* bg */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed animate-zoom"
        style={{ backgroundImage: "url(/images/bg2.jpg)" }}
      />
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* icons */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <span className="floating-icon">🛍️</span>
        <span className="floating-icon delay-200">💳</span>
        <span className="floating-icon delay-400">📦</span>
      </div>

      <Navbar />

      {/* Intro */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center bg-[rgba(255,255,255,0.1)] backdrop-blur-md shadow-lg p-10 md:mx-[20%] mx-[5%] rounded-lg">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg animate-fadeIn">
          Welcome to <span className="text-gray-900">VeryMarket</span>
        </h1>
        <div className="mt-4 text-lg md:text-xl font-semibold text-gray-900 animate-fadeIn">
          E-commerce for the underbanked across Africa
        </div>
        <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl animate-fadeIn">
          A decentralized marketplace powered by the Hedera Network. Buy, sell,
          and manage your assets seamlessly on-chain.
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

      {/* Auto-navigation */}
      <div className="relative z-10 my-[1cm] flex flex-col items-center justify-center">
        {allowAutoNav ? (
          <div className="rounded-xl p-8 text-center w-[90%] md:w-[400px] animate-fadeIn">
            <p className="text-white text-lg font-medium mb-6">
              Redirecting you to the dashboard...
            </p>
            <div className="relative w-20 h-20 mx-auto">
              <svg
                viewBox="0 0 80 80"
                className="w-full h-full rounded-[100%] transform -rotate-90"
              >
                <circle
                  cx="40"
                  cy="40"
                  r={count > 0 ? 36 * (count / 30) : 36}
                  stroke={count > 20 ? "#234" : count > 10 ? "#44f" : "#ef4444"}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={
                    2 * Math.PI * (36 * (count > 0 ? count / 30 : 1))
                  }
                  strokeDashoffset={0}
                  className={
                    count > 0
                      ? count > 20
                        ? "animate-glowGray"
                        : count > 10
                        ? "animate-glowBlue"
                        : "animate-glowRed"
                      : "animate-burst"
                  }
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${
                  count > 20
                    ? "text-gray-400"
                    : count > 10
                    ? "text-blue-400"
                    : "text-red-400"
                } ${count === 0 ? "animate-burstText" : "animate-pulse"}`}
              >
                {count > 0 ? count : "🛒"}
              </span>
            </div>
            <button
              onClick={stopNav}
              className="mt-8 px-6 py-2 bg-red-900 cursor-pointer hover:bg-red-800 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              Cancel Auto-Navigation
            </button>
          </div>
        ) : (
          <div className="backdrop-blur-md rounded-xl shadow-lg p-6 text-center w-[70%] md:w-[400px] animate-fadeIn">
            <p className="text-white text-lg font-medium">
              Auto-navigation <span className="font-bold text-red-500">cancelled</span>
            </p>
          </div>
        )}
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
                ? "animate-pulse border-2 border-yellow-400"
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
                ? "animate-pulse border-2 border-yellow-400"
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
                ? "animate-pulse border-2 border-yellow-400"
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