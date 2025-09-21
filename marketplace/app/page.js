"use client";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
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
        const contract = new Contract(
          MARKETPLACE_ADDRESS,
          MARKETPLACE_ABI,
          provider
        );

        const listings = await contract.listingCount();
        const orders = await contract.orderCount();

        const fetched = [];
        for (let i = 1; i <= orders; i++) {
          const anyOrder = await contract.orders(i);
          if (Number(anyOrder.status) === 5) {
            fetched.push(anyOrder);
          }
        }

        setStats({
          listings: Number(listings),
          orders: Number(orders),
          disputes: fetched,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }
    fetchStats();
  }, [walletProvider]);

  // create countdown for dashboard navigation
  const [count, setCount] = useState(30);
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCount((prevCount) => prevCount - 1);
    }, 1000);

    // Clear the interval when the component is unmounted
    return () => clearInterval(countdownInterval);
  }, []);

  //navigate to dashboard page
  const [allowAutoNav, setAllowAutoNav] = useState(true);
  useEffect(() => {
    const autoNav =
      allowAutoNav &&
      setTimeout(() => {
        router.push("/dashboard");
      }, 31000);

    // Cleanup function to clear the timeout when the component is unmounted or auto navigation is stopped
    return () => clearTimeout(autoNav);
  }, [allowAutoNav, router]);

  //stop navigation to dashboard page
  const stopNav = () => {
    setAllowAutoNav(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Animated Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed animate-zoom"
        style={{
          backgroundImage: "url(/images/bg2.jpg)",
        }}
      ></div>
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Floating shopping icons */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <span className="floating-icon">🛍️</span>
        <span className="floating-icon delay-200">💳</span>
        <span className="floating-icon delay-400">📦</span>
      </div>

      <Navbar />

      {/* Intro Section */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center bg-[rgba(255,255,255,0.1)] backdrop-blur-md shadow-lg p-10 md:mx-[20%]  mx-[5%] rounded-lg">
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

      {/* Auto-navigation section */}
      <div className="relative z-10 my-[1cm] flex flex-col items-center justify-center">
        {allowAutoNav ? (
          <div className="rounded-xl p-8 text-center w-[90%] md:w-[400px] animate-fadeIn">
            <p className="text-white text-lg font-medium mb-6">
              Redirecting you to the dashboard...
            </p>

            {/* Circular countdown */}
            <div className="relative w-20 h-20  mx-auto">
              <svg
                viewBox="0 0 80 80"
                className="w-full h-full rounded-[100%] transform -rotate-90"
              >
                <circle
                  cx="40"
                  cy="40"
                  r={count > 0 ? 36 * (count / 30) : 36} // ✅ shrink while counting, burst at 0
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
                      : "animate-burst" // ✅ burst effect at 0
                  }
                />
              </svg>

              {/* Countdown number */}
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

            {/* Cancel button */}
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
              Auto-navigation{" "}
              <span className="font-bold text-red-500">cancelled</span>
            </p>
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="relative z-10 py-12 px-6">
        <h2
          className="text-center text-2xl font-bold text-white mb-8 animate-fadeIn"
          style={{ textShadow: "2px 2px 10px #fff" }}
        >
          Marketplace Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="statCol p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-200">
            <h3 className="text-4xl font-bold text-white">{stats.listings}</h3>
            <p className="mt-2 text-white/90">
              {stats.listings == "1" ? (
                <span>Total Listing</span>
              ) : (
                <span>Total Listings</span>
              )}
            </p>
          </div>
          <div className="statCol p-6 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-400">
            <h3 className="text-4xl font-bold text-white">{stats.orders}</h3>
            <p className="mt-2 text-white/90">
              {stats.orders == "1" ? (
                <span>Active Order</span>
              ) : (
                <span>Active Orders</span>
              )}
            </p>
          </div>
          <div className="statCol p-6 rounded-xl bg-gradient-to-br from-red-700 to-red-500 shadow-lg text-center transform hover:scale-105 transition animate-slideUp delay-600">
            <h3 className="text-4xl font-bold text-white">
              {stats.disputes.length}
            </h3>
            <p className="mt-2 text-white/90">
              {stats.disputes.length == "1" ? (
                <span>Disputed Order</span>
              ) : (
                <span>Disputed Orders</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
