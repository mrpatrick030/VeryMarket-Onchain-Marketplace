"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from "chart.js";
import { Line, Bar, Doughnut, Pie } from "react-chartjs-2";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, Package, ShoppingCart, DollarSign, TrendingDown, Store, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import AnalyticsInsights from "./AnalyticsInsights";
import ActivityFeed from "./LiveActivityFeed";

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

function statusLabel(num) {
  switch (num) {
    case 0: return "None";
    case 1: return "Requested";
    case 2: return "ShippingSet";
    case 3: return "Escrowed";
    case 4: return "Shipped";
    case 5: return "Disputed";
    case 6: return "Refunded";
    case 7: return "Released";
    case 8: return "Cancelled";
    case 9: return "DisputeResolved";
    default: return String(num);
  }
}

function shortOr(val, fallback = "-") {
  if (val === undefined || val === null) return fallback;
  return val;
}

export default function AnalyticsTab({ darkMode = false, TOKEN_LOGOS = {} }) {
  const { address: userAddress, caipAddress, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const [viewMode, setViewMode] = useState("global"); // "global" or "buyer" or "seller"
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(null);
  const [listings, setListings] = useState([]);
  const [allListingsData, setAllListingsData] = useState([])
  const [ordersByListing, setOrdersByListing] = useState({});
  const [storeCount, setStoreCount] = useState();

  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    activeListings: 0,
    completedOrders: 0,
    disputedOrders: 0,
  });

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rangePreset, setRangePreset] = useState("30d");
  const debounceTimer = useRef(null);

  // NEW: Toggle for AI Insights
  const [showInsights, setShowInsights] = useState(false);

  const [refresh, setRefresh] = useState(false)
    async function loadAll() {
          if (refresh === false) {
          setLoading(true)
        }
      try {
        setErrors(null);

        let provider;
        if (walletProvider) provider = new BrowserProvider(walletProvider);
        else if (typeof window !== "undefined" && window.ethereum) provider = new BrowserProvider(window.ethereum);
        else provider = new BrowserProvider(window?.ethereum || null);

        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        const [allListings, allStores] = await Promise.all([
          contract.getAllListings(),
          contract.getAllStores().catch(() => []),
        ]);

        const normalizedListings = allListings.map((l, i) => ({
          id: Number(l.id || i + 1),
          seller: l.seller,
          paymentToken: l.paymentToken,
          price: l.price ? BigInt(l.price.toString()) : BigInt(0),
          title: l.title,
          uri: l.uri,
          active: l.active, 
          quantity: Number(l.quantity || 0),
          initialQuantity: Number(l.initialQuantity || 0),
          storeId: Number(l.storeId || 0),
          category: l.category || "Uncategorized",
          dateAdded: l.dateAdded || "",
          description: l.description || "",
        }));

        const allActiveListings = normalizedListings.filter((l) => l.active);
        setAllListingsData(allActiveListings)
        

        const ordersMap = {};
        for (const L of normalizedListings) {
          try {
            const rawOrders = await contract.getOrdersForListing(L.id);
            const norm = rawOrders.map((o) => ({
              id: Number(o.id),
              buyer: o.buyer,
              seller: o.seller,
              listingId: Number(o.listingId),
              storeId: Number(o.storeId),
              paymentToken: o.paymentToken,
              amount: o.amount ? BigInt(o.amount.toString()) : BigInt(0),
              quantity: Number(o.quantity || 0),
              uri: o.uri,
              title: o.title,
              shippingFee: o.shippingFee ? BigInt(o.shippingFee.toString()) : BigInt(0),
              estimatedDeliveryDays: Number(o.estimatedDeliveryDays || 0),
              buyerLocation: o.buyerLocation,
              status: Number(o.status),
              fundsEscrowed: o.fundsEscrowed,
              completed: o.completed,
              buyerComment: o.buyerComment,
              rated: o.rated,
              createdAt: Number(o.createdAt || 0),
            }));
            ordersMap[L.id] = norm;
          } catch (err) {
            ordersMap[L.id] = [];
          }
        }


let filteredListings = normalizedListings;
let filteredOrders = ordersMap;

if (userAddress) {
  const addr = userAddress.toLowerCase();

  if (viewMode === "seller") {
    // 🏪 User as Seller
    filteredListings = normalizedListings.filter(
      (l) => l.seller?.toLowerCase() === addr
    );

    const userOrdersMap = {};
    for (const [listingId, orders] of Object.entries(ordersMap)) {
      const sellerOrders = orders.filter(
        (o) => o.seller?.toLowerCase() === addr
      );
      if (sellerOrders.length > 0) userOrdersMap[listingId] = sellerOrders;
    }
    filteredOrders = userOrdersMap;

  } else if (viewMode === "buyer") {
    // 🛒 User as Buyer
    filteredListings = []; //
    const userOrdersMap = {};
    for (const [listingId, orders] of Object.entries(ordersMap)) {
      const buyerOrders = orders.filter(
        (o) => o.buyer?.toLowerCase() === addr
      );
      if (buyerOrders.length > 0) userOrdersMap[listingId] = buyerOrders;
    }
    filteredOrders = userOrdersMap;
  }
}

setListings(filteredListings);
setOrdersByListing(filteredOrders);

        let totalOrders = 0, completedOrders = 0, disputedOrders = 0;
        const activeListings = filteredListings.filter((l) => l.active).length;
        for (const L of normalizedListings) {
          for (const o of filteredOrders[L.id] || []) {
            totalOrders++;
            if (o.status === 7 || o.status === 9) completedOrders++;
            if (o.status === 5) disputedOrders++;
          }
        }
        setMetrics({ totalOrders, activeListings, completedOrders, disputedOrders });

        //get store count
if (viewMode === "seller" && userAddress) {
  try {
    const store = await contract.getStoreByAddress(userAddress);
    store?.exists ? setStoreCount(1) : 0
  } catch (err) {
    console.warn("No store found for this user");
  }
}
else if (viewMode === "buyer" && userAddress){
  setStoreCount(0)
}
else {
    const sc = await contract.storeCount();
    setStoreCount(BigInt(sc));
}
      } catch (err) {
        setErrors(err?.message);
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
    loadAll();
    setRefresh(true)
      // update every 90s
    const interval = setInterval(() => {
      loadAll();
    }, 120000)
    return () => clearInterval(interval);
  }, [walletProvider, viewMode]);

  useEffect(() => {
    const now = new Date();
    let s = null, e = null;
    if (rangePreset === "7d") { e = now; s = new Date(now - 7 * 864e5); }
    else if (rangePreset === "30d") { e = now; s = new Date(now - 30 * 864e5); }
    else if (rangePreset === "month") { e = now; s = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (rangePreset === "all") { s = null; e = null; }
    setStartDate(s); setEndDate(e);
  }, [rangePreset]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { debounceTimer.current = null; }, 250);
    return () => debounceTimer.current && clearTimeout(debounceTimer.current);
  }, [startDate, endDate]);

  const [insightsData, setInsightsData] = useState({
  salesByDayToken: {},
  statusCounts: {},
  categoryCounts: {},
  revenueByCategoryToken: {},
});

  const charts = useMemo(() => {
    const flatOrders = [];
    for (const L of allListingsData) {
      for (const o of ordersByListing[L.id] || []) {
        flatOrders.push({
          ...o,
          category: L.category || "Uncategorized",
          createdAtMs: o.createdAt ? Number(o.createdAt) * 1000 : null,
        });
      }
    }

    const withinRange = (ms) => {
      if (!ms) return false;
      if (startDate && endDate) {
        const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
        return ms >= startDate.getTime() && ms <= endOfDay.getTime();
      }
      if (startDate) return ms >= startDate.getTime();
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); return ms <= e.getTime(); }
      return true;
    };

    const statusCounts = {};
    const categoryCounts = {};
    const revenueByCategory = {};
    const salesByDayToken = {};

    for (const o of flatOrders) {
      if (!withinRange(o.createdAtMs)) continue;
      // general aggregations
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
      const rev = Number(BigInt(o.amount) + BigInt(o.shippingFee || 0)) * 1e-18;
      revenueByCategory[o.category] = (revenueByCategory[o.category] || 0) + rev;

      // sales per token per day
      if (o.status === 7 || o.status === 9) {
        const key = new Date(o.createdAtMs).toISOString().slice(0, 10);
        const token = o.paymentToken;
        salesByDayToken[token] = salesByDayToken[token] || {};
        salesByDayToken[token][key] = (salesByDayToken[token][key] || 0) + rev;
      }
    }

    const allDates = [...new Set(Object.values(salesByDayToken).flatMap(x => Object.keys(x)))].sort();
    const tokenColors = { USDC: "#2775CA", USDT: "#26A17B", DAI: "#F4B731", HBAR: "#6C6C6C" };

    const lineData = {
      labels: allDates.length ? allDates : ["No data"],
      datasets: Object.entries(TOKEN_LOGOS).map(([addr, meta]) => {
        const name = meta.name || "Token";
        const color = tokenColors[name] || "#999";
        return {
          label: ` ${name}`,
          data: allDates.map(d => salesByDayToken[addr]?.[d] || 0),
          borderColor: color,
          backgroundColor: color + "33",
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: color,
        };
      }),
    };

    const barData = {
      labels: Object.keys(categoryCounts).length ? Object.keys(categoryCounts) : ["No data"],
      datasets: [{ label: "Orders", data: Object.values(categoryCounts), borderRadius: 6, backgroundColor: darkMode ? "rgba(52,211,153,0.88)" : "rgba(34,197,94,0.88)" }],
    };

    const statusColorsLight = [
  "#9CA3AF", // None
  "#3B82F6", // Requested
  "#A855F7", // ShippingSet
  "#FACC15", // Escrowed
  "#FB923C", // Shipped
  "#EF4444", // Disputed
  "#0EA5E9", // Refunded
  "#22C55E", // Released
  "#6B7280", // Cancelled
  "#8B5CF6", // DisputeResolved
];

const statusColorsDark = [
  "#6B7280", // None
  "#60A5FA", // Requested
  "#C084FC", // ShippingSet
  "#EAB308", // Escrowed
  "#FBBF24", // Shipped
  "#F87171", // Disputed
  "#38BDF8", // Refunded
  "#34D399", // Released
  "#9CA3AF", // Cancelled
  "#A78BFA", // DisputeResolved
];

    const doughnutPalette = darkMode ? statusColorsDark : statusColorsLight;
    const doughnutData = {
  labels: Object.keys(statusCounts).length ? Object.keys(statusCounts).map((s) => statusLabel(Number(s))) : ["No data"],
  datasets: [
    {
      label: "Orders",
      data: Object.values(statusCounts),
      backgroundColor: Object.keys(statusCounts).map((s) => doughnutPalette[Number(s)] || "#999"),
      hoverOffset: 8,
    },
  ],
};

// Revenue by Category (per token)
const piePalette = darkMode
  ? ["#34d399", "#60a5fa", "#fb923c", "#a78bfa", "#f472b6", "#facc15", "#4ade80", "#38bdf8"]
  : ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#eab308", "#10b981", "#0ea5e9"];

// Compute total revenue by category and token
const revenueByCategoryToken = {};
for (const L of allListingsData) {
  const orders = ordersByListing[L.id] || [];
  for (const o of orders) {
    if (o.status === 7 || o.status === 9) {
      const cat = L.category || "Uncategorized";
      const token = o.paymentToken;
      const rev = Number(BigInt(o.amount) + BigInt(o.shippingFee || 0)) * 1e-18;
      if (!revenueByCategoryToken[cat]) revenueByCategoryToken[cat] = {};
      revenueByCategoryToken[cat][token] =
        (revenueByCategoryToken[cat][token] || 0) + rev;
    }
  }
}

// Build dataset for each token
const categories = Object.keys(revenueByCategoryToken);
const pieData = {
  labels: categories.length ? categories : ["No data"],
  datasets: Object.entries(TOKEN_LOGOS).map(([addr, meta], idx) => ({
    label: meta.name || "Token",
    data: categories.map((cat) => revenueByCategoryToken[cat]?.[addr] || 0),
    backgroundColor: piePalette[idx % piePalette.length],
    borderWidth: 1,
  })),
};

   setInsightsData({ salesByDayToken, statusCounts, categoryCounts, revenueByCategoryToken });

    return { lineData, barData, doughnutData, pieData };
  }, [allListingsData, ordersByListing, startDate, endDate, darkMode]);

  const baseTextColor = darkMode ? "#e5e7eb" : "#1f2937";
  const chartOptions = { plugins: { legend: { labels: { color: baseTextColor } } }, scales: { x: { ticks: { color: baseTextColor } }, y: { ticks: { color: baseTextColor } } }, maintainAspectRatio: false };
  const containerBg = darkMode ? "bg-gray-900 text-gray-200" : "bg-gray-50 text-gray-800";
  const cardBg = darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800";
  const accent = "from-blue-500 to-sky-600";

  if (!userAddress) return <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>Please connect your wallet to view analytics.</div>;

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors duration-300 ${containerBg}`}>
      <h2 className="text-xl font-bold mb-4">📊 Analytics</h2>
<div className="flex lg:justify-end mb-4">
  <div
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
      darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
    } shadow-sm`}
  >
    {[
      { key: "global", label: "🌍 Global" },
      { key: "buyer", label: "🛒 As buyer" },
      { key: "seller", label: "🏪 As seller" },
    ].map((item) => (
      <button
        key={item.key}
        onClick={() => setViewMode(item.key)}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
          viewMode === item.key
            ? "bg-gradient-to-r from-blue-500 to-sky-600 text-white shadow"
            : darkMode
            ? "text-gray-300"
            : "text-gray-600"
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
</div>
      <div className="flex items-center overflow-auto justify-between mb-3">
        {/* Date Filter panel */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {[
              { key: "7d", label: "Last 7d" },
              { key: "30d", label: "30d" },
              { key: "month", label: "This month" },
              { key: "all", label: "All time" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setRangePreset(p.key)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition transform hover:-translate-y-0.5 ${
                  rangePreset === p.key
                    ? `text-white bg-gradient-to-br ${accent} shadow-md`
                    : `bg-transparent border border-gray-200 dark:border-gray-700 ${darkMode ? "text-gray-200" : "text-gray-700"}`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date pickers - separate start + end in same compact panel */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 bg-transparent rounded-md p-1"
          >
            <div className="relative">
              <label className="sr-only">Start date</label>
              <DatePicker
                selected={startDate}
                onChange={(d) => { setStartDate(d); setRangePreset("custom"); }}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start date"
                className={`w-40 text-sm px-3 py-2 pl-9 rounded-lg border focus:ring-2 focus:ring-emerald-300 transition ${
                  darkMode ? "bg-gray-700 text-gray-100 border-gray-700" : "bg-white text-gray-800 border-gray-200"
                }`}
              />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                📅
              </div>
            </div>

            <div className="relative">
              <label className="sr-only">End date</label>
              <DatePicker
                selected={endDate}
                onChange={(d) => { setEndDate(d); setRangePreset("custom"); }}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End date"
                className={`w-40 text-sm px-3 py-2 pl-9 rounded-lg border focus:ring-2 focus:ring-emerald-300 transition ${
                  darkMode ? "bg-gray-700 text-gray-100 border-gray-700" : "bg-white text-gray-800 border-gray-200"
                }`}
              />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                📅
              </div>
            </div>

            <button
              onClick={() => { setStartDate(null); setEndDate(null); setRangePreset("all"); }}
              className={`px-3 py-2 rounded-md text-sm border hover:bg-gray-200 hover:text-gray-100 dark:hover:bg-gray-600 ${darkMode ? "bg-gray-700 text-gray-100 border-gray-700" : "bg-white text-gray-800 border-gray-200"} transition`}
              title="Clear range"
            >
              Clear
            </button>
          </motion.div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
        <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
        </div>)}
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              {
                title: "Active Listings",
                value: metrics.activeListings,
                icon: <Package className="text-yellow-200" size={26} />,
                color: "from-yellow-400 to-amber-500",
              },
              {
                title: "Total Orders",
                value: metrics.totalOrders,
                icon: <ShoppingCart className="text-blue-200" size={26} />,
                color: "from-blue-500 to-sky-600",
              },
              {
                title: "Completed Orders",
                value: metrics.completedOrders,
                icon: <TrendingUp className="text-purple-200" size={26} />,
                color: "from-purple-500 to-indigo-600",
              },
              {
                title: "Disputed Orders",
                value: metrics.disputedOrders,
                icon: <TrendingDown className="text-red-200" size={26} />,
                color: "from-red-500 to-red-800",
              },
              {
                title: "Total Stores",
                value: storeCount,
                icon: <Store className="text-violet-200" size={26} />,
                color: "from-pink-500 to-violet-600",
              },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`rounded-xl p-5 flex items-center justify-between ${darkMode ? "bg-gradient-to-br from-gray-800 to-gray-700 text-gray-100" : `bg-gradient-to-br ${card.color} text-white`} shadow-md`}
              >
                <div>
                  <p className="text-sm opacity-80 mb-2">{card.title}</p>
                  <h2 className="text-2xl font-semibold">{shortOr(card.value, "-")}</h2>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">{card.icon}</div>
              </motion.div>
            ))}
          </div>

{/* Sales by Token */}
<div className="mt-6">
  <h2 className="text-lg font-semibold mb-4">Sales by Token</h2>
  <div className="grid md:grid-cols-3 grid-cols-2 gap-4">
    {Object.keys(TOKEN_LOGOS).map((tokenAddr) => {
      let total = 0;
      for (const L of listings) {
        const orders = ordersByListing[L.id] || [];
        for (const o of orders) {
          if ((o.status === 7 || o.status === 9) && o.paymentToken === tokenAddr) {
            total += Number(BigInt(o.amount) + BigInt(o.shippingFee || 0)) * 10**-18;
          }
        }
      }

      const token = TOKEN_LOGOS[tokenAddr] || {};
      return (
        <motion.div
          key={tokenAddr}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 flex flex-col items-center justify-center ${cardBg} shadow`}
        >
          <img src={token.logo} alt={token.name} className="h-8 w-8 mb-2 inline-block" />
          <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">{total.toLocaleString()}</h3>
          <p className="text-sm font-medium inline-block">{token.name || "Unknown"}</p>
          </div>
        </motion.div>
      );
    })}
  </div>
</div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6">
        {/* Sales Over Time */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardBg} shadow`}>
        <h2 className="text-lg font-semibold mb-4">Sales Over Time by Token</h2>
        <div style={{ height: 280 }}>
          <Line data={charts.lineData} options={chartOptions} />
        </div>
      </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardBg} shadow`}>
              <h2 className="text-lg font-semibold mb-4">Orders by Category</h2>
              <div style={{ height: 280 }}>
                <Bar data={charts.barData} options={chartOptions} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardBg} shadow`}>
              <h2 className="text-lg font-semibold mb-4">Order Status Breakdown</h2>
              <div style={{ height: 280 }}>
                <Doughnut data={charts.doughnutData} options={{...chartOptions,
                 scales: {
                 x: { display: false },
                 y: { display: false },
                },}} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardBg} shadow`}>
              <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
              <div style={{ height: 280 }}>
                <Pie data={charts.pieData} options={{...chartOptions,
                 scales: {
                 x: { display: false },
                 y: { display: false },
                },}} />
              </div>
            </motion.div>
          </div>

      {/* AI Insights Collapsible Section */}
      <div className="mt-10">
        <button
          onClick={() => setShowInsights(!showInsights)}
          className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-medium shadow-sm transition-all ${
            darkMode
              ? "bg-emerald-600/80 hover:bg-emerald-500 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          }`}
        >
          <Sparkles size={18} />
          {showInsights ? "Hide AI Insights" : "View AI Insights"}
          {showInsights ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <AnimatePresence initial={false}>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden mt-4"
            >

           <AnalyticsInsights
            metrics={metrics || {}}
            storeCount={storeCount || 0}
            salesByDayToken={insightsData.salesByDayToken}
            statusCounts={insightsData.statusCounts}
            categoryCounts={insightsData.categoryCounts}
            revenueByCategoryToken={insightsData.revenueByCategoryToken}
            TOKEN_LOGOS={TOKEN_LOGOS}
            viewMode={viewMode}
            darkMode={darkMode}
          />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

          {/* Live Activity Feed */}
          <ActivityFeed walletProvider={walletProvider} TOKEN_LOGOS={TOKEN_LOGOS} darkMode={darkMode} />
        </>
    </div>
  );
} 