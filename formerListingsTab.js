"use client";
import { useState, useEffect, useMemo } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { Search, Grid, List, LayoutGrid, Menu, X, MessageCircle, MessageSquare, UserCircle, Folder } from "lucide-react";

import Link from "next/link";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import ConfirmModal from "./ConfirmModal";
import InputModal from "./InputModal";
import ShippingModal from "./ShippingModal";
import BuyerConfirmPayModal from "./BuyerConfirmPayModal";


export default function ListingsTab({ TOKEN_LOGOS, pushToast, darkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();

  const [contract, setContract] = useState(null);
  const [listings, setListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recent");
  const [layout, setLayout] = useState("grid2"); // grid1, grid2, grid3
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState(null); // single product view
  const [profileSeller, setProfileSeller] = useState(null); // seller profile view
  const [loading, setLoading] = useState(false);

  //dark mode
  const bg = darkMode ? "bg-gray-800" : "bg-white";
  const inputBg = darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-900";

  //Edit listing modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    paymentToken: Object.keys(TOKEN_LOGOS || {})[0] || "0x0000000000000000000000000000000000000000",
    price: "",
    title: "",
    uri: "",
    quantity: "",
    storeId: "",
    category: "",
    description: "",
  });
  const [editingListingId, setEditingListingId] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // ---------------- SETUP CONTRACT ----------------
  useEffect(() => {
    if (!walletProvider) return;
    const init = async () => {
      try {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const c = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        setContract(c);
      } catch (err) {
        console.error("Contract init err", err);
      }
    };
    init();
  }, [walletProvider]);

  // Categories to use for create listing
  const CATEGORIES = [
    { name: "Electronics", symbol: "📱" },
    { name: "Fashion & Clothing", symbol: "👕" },
    { name: "Shoes & Footwear", symbol: "👟" },
    { name: "Bags & Accessories", symbol: "👜" },
    { name: "Health & Beauty", symbol: "💄" },
    { name: "Home & Furniture", symbol: "🏠" },
    { name: "Kitchen & Dining", symbol: "🍳" },
    { name: "Sports & Fitness", symbol: "🏋️" },
    { name: "Books & Stationery", symbol: "📚" },
    { name: "Toys & Games", symbol: "🧸" },
    { name: "Baby Products", symbol: "🍼" },
    { name: "Groceries & Food", symbol: "🛒" },
    { name: "Beverages", symbol: "🥤" },
    { name: "Automotive", symbol: "🚗" },
    { name: "Motorcycles & Scooters", symbol: "🏍️" },
    { name: "Jewelry & Watches", symbol: "💍" },
    { name: "Music & Instruments", symbol: "🎸" },
    { name: "Movies & Entertainment", symbol: "🎬" },
    { name: "Pets & Supplies", symbol: "🐾" },
    { name: "Real Estate", symbol: "🏡" },
    { name: "Art & Collectibles", symbol: "🎨" },
    { name: "Industrial & Tools", symbol: "⚙️" },
    { name: "Office Supplies", symbol: "🖇️" },
    { name: "Services", symbol: "🛠️" },
    { name: "Tickets & Events", symbol: "🎟️" },
    { name: "Travel & Luggage", symbol: "✈️" },
    { name: "Gardening & Outdoors", symbol: "🌱" },
    { name: "Energy & Solar", symbol: "🔋" },
    { name: "Gaming", symbol: "🎮" },
  ];

  // ---------------- FETCH ACTIVE LISTINGS ----------------
  const loadActiveListings = async () => {
    if (!contract) return;
    try {
      const activeListings = await contract.getActiveListings();
      const formatted = activeListings.map((l, i) => ({
        id: i + 1,
        title: l.title,
        description: l.description,
        storeId: Number(l.storeId),
        category: l.category,
        price: Number(formatUnits(l.price, 18)),
        quantity: Number(l.quantity),
        seller: l.seller,
        paymentToken: l.paymentToken,
        uri: l.uri,
        dateAdded: Number(l.dateAdded) ? Number(l.dateAdded) * 1000 : Date.now(),
      }));
      setListings(formatted);
      setFiltered(formatted);
    } catch (err) {
      console.error("Error fetching listings:", err);
    }
  };

  useEffect(() => {
    loadActiveListings();
  }, [contract]);

  // ---------------- FILTER + SORT ----------------
  useEffect(() => {
    let results = [...listings];

    if (category !== "All") {
      results = results.filter((l) => l.category === category);
    }

    if (search.trim()) {
      results = results.filter(
        (l) =>
          (l.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (l.description || "").toLowerCase().includes(search.toLowerCase()) ||
          (l.category || "").toLowerCase().includes(search.toLowerCase()) ||
          String(l.storeId).includes(search.toLowerCase()) ||
          (l.paymentToken || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === "a-z") results.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "z-a") results.sort((a, b) => b.title.localeCompare(a.title));
    if (sort === "recent") results.sort((a, b) => b.dateAdded - a.dateAdded);
    if (sort === "earliest") results.sort((a, b) => a.dateAdded - b.dateAdded);
    if (sort === "token")
      results.sort((a, b) => (a.paymentToken || "").localeCompare(b.paymentToken || ""));

    setFiltered(results);
  }, [search, category, sort, listings]);

  // ---------------- LAYOUT GRID STYLES ----------------
  const gridClass = useMemo(() => {
    if (layout === "grid1") return "grid-cols-1";
    if (layout === "grid3") return "grid-cols-3";
    return "grid-cols-2";
  }, [layout]);

  // ---------------- CATEGORY LIST ----------------
const categories = useMemo(() => ["All", ...CATEGORIES.map((c) => c.name)], []);





  // ---------------- CONTRACT ACTIONS (LISTINGS) ----------------

  // Open edit: fetch listing from contract and prefill
const openEditModal = async (listingId) => {
  if (!contract) return alert("Connect wallet first");
  try {
    const onChain = await contract.getListing(listingId);

    setEditingListingId(listingId);

    setForm({
      // Only price + quantity matter for update, but we can still fetch/store other fields
      price: Number(formatUnits(onChain.price, 18)).toString(),
      quantity: String(onChain.quantity),
    });

    setEditModalOpen(true);
  } catch (err) {
    console.error("getListing err", err);
    alert("Error loading listing for edit");
  }
};


//Update listing
const updateListing = async (listingId, form) => {
  try {
    setLoadingAction(true);

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    const priceWei = parseUnits(form.price.toString(), 18);

    const tx = await contract.updateListing(
      listingId,
      priceWei,
      true,
      form.quantity
    );

    await tx.wait();
    pushToast("✅ Listing updated successfully!");
    setEditModalOpen(false);
  } catch (err) {
    console.error("Update error:", err);
    pushToast("❌ Failed to update listing", "error");
  } finally {
    setLoadingAction(false);
  }
};

// Deactivate listing
const deactivateListing = (id) => {
  if (!contract) return pushToast("error", "Connect wallet first");

  askConfirm(
    "Deactivate Listing",
    "Are you sure you want to deactivate this listing?",
    async () => {
      try {
        setLoadingAction(true);
        const tx = await contract.deactivateListing(id);
        await tx.wait();
        pushToast("success", "Listing deactivated");
        await loadActiveListings();
      } catch (err) {
        console.error("deactivateListing err", err);
        pushToast("error", "Error deactivating listing");
      } finally {
        setLoadingAction(false);
      }
    }
  );
};

// Cancel listing if no sales
const cancelListingIfNoSales = (id) => {
  if (!contract) return pushToast("error", "Connect wallet first");

  askConfirm(
    "Cancel Listing",
    "This action is only allowed if there are no sales. Do you want to proceed?",
    async () => {
      try {
        setLoadingAction(true);
        const tx = await contract.cancelListingIfNoSales(id);
        await tx.wait();
        pushToast("success", "Listing cancelled");
        await loadActiveListings();
      } catch (err) {
        console.error("cancelListingIfNoSales err", err);
        pushToast("error", "Error cancelling listing (maybe it has sales)");
      } finally {
        setLoadingAction(false);
      }
    }
  );
};


  // ---------------- ORDERS (existing flows) ----------------
    //For confirm modal
const [confirmOpen, setConfirmOpen] = useState(false);
const [confirmConfig, setConfirmConfig] = useState({
  title: "",
  message: "",
  onConfirm: () => {},
});

// helper
const askConfirm = (title, message, onConfirm) => {
  setConfirmConfig({ title, message, onConfirm });
  setConfirmOpen(true);
};

//For input modal
const [inputOpen, setInputOpen] = useState(false);
const [inputConfig, setInputConfig] = useState({
  title: "",
  fields: [],
  onSubmit: () => {},
});

// helper
const askInput = (title, fields, onSubmit) => {
  setInputConfig({ title, fields, onSubmit });
  setInputOpen(true);
};
// Create order request
const createOrderRequest = (id, price, paymentToken, seller) => {
  if (!contract) return pushToast("error", "Connect wallet first");

  askInput(
    "Buy Listing",
    [
      { name: "quantity", label: "Quantity", type: "number", placeholder: "Enter quantity" },
      { name: "location", label: "Delivery Location", type: "text", placeholder: "Enter location" },
    ],
    async (values) => {
      try {
        const { quantity, location } = values;
        if (!quantity || !location) return pushToast("error", "All fields required");

        setLoadingAction(true);
        let tx;
        if (paymentToken === "ETH") {
          tx = await contract.createOrderRequest(id, quantity, location, {
            value: parseUnits((price * quantity).toString(), 18),
          });
        } else {
          tx = await contract.createOrderRequest(id, quantity, location);
        }
        await tx.wait();
        pushToast("success", "Listing purchased");
        await loadActiveListings();
      } catch (err) {
        console.error("buyListing error", err);
        pushToast("error", "Error purchasing listing");
      } finally {
        setLoadingAction(false);
      }
    }
  );
};


//seller set shipping
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const openShippingModal = (orderId) => {
    setSelectedOrderId(orderId);
    setShippingModalOpen(true);
  };
const sellerSetShipping = async (orderId, shippingFee, etaDays) => {
  try {
    const tx = await contract.sellerSetShipping(orderId, shippingFee, etaDays);
    await tx.wait();
    pushToast("success", "Shipping details set ✅");
  } catch (err) {
    console.error(err);
    pushToast("error", "Error setting shipping details ❌");
  }
};


// Buyer confirm and pay
const [confirmModalOpen, setConfirmModalOpen] = useState(false);
const [selectedOrder, setSelectedOrder] = useState(null);

// Open modal
const openConfirmModal = (order) => {
  setSelectedOrder(order);
  setConfirmModalOpen(true);
};
const buyerConfirmAndPay = async (orderId, paymentToken, total) => {
  try {
    let tx;

    if (paymentToken === ethers.ZeroAddress) {
      // Pay with ETH
      tx = await contract.buyerConfirmAndPay(orderId, {
        value: total, // total = amount + shippingFee
      });
    } else {
      // Pay with ERC20
      const erc20 = new ethers.Contract(
        paymentToken,
        [
          "function approve(address spender, uint256 amount) public returns (bool)"
        ],
        signer
      );

      // 1. Approve contract to spend tokens
      const approveTx = await erc20.approve(contract.target, total);
      await approveTx.wait();

      // 2. Call confirm and pay
      tx = await contract.buyerConfirmAndPay(orderId);
    }

    await tx.wait();
    pushToast("success", "Payment confirmed and escrowed ✅");
  } catch (err) {
    console.error(err);
    pushToast("error", "Error confirming payment ❌");
  }
};




    // ---------------- CONTRACT ACTIONS ----------------
    // Generic call helper
const call = async (fn, ...args) => {
  try {
    const tx = await contract[fn](...args);
    await tx.wait();
    pushToast("success", `${fn} successful ✅`);
  } catch (err) {
    console.error(err);
    pushToast("error", `Error in ${fn}`);
  }
};

  // Seller actions
  const cancelListing = (id) => call("cancelListing", id);
  const markShipped = (orderId) => call("markShipped", orderId);

  // Buyer actions
  const confirmDelivery = (orderId) => call("confirmDelivery", orderId);
  const buyerCancelBeforeEscrow = (orderId) =>
    call("buyerCancelBeforeEscrow", orderId);
  const buyerCancelAndRefund = (orderId) =>
    call("buyerCancelAndRefund", orderId);

  // Dispute actions
  const openDispute = (orderId) => call("openDispute", orderId);
  const resolveDispute = (orderId, ruling) =>
    call("resolveDispute", orderId, ruling);

  // Queries
  const getOrdersForListing = (id) => call("getOrdersForListing", id);
  const getStoreListings = (storeId) => call("getStoreListings", storeId);
  const getOrdersForStore = (storeId) => call("getOrdersForStore", storeId);




  // Fetch listings for Seller Profile
  useEffect(() => {
    const fetchSellerListings = async () => {
      if (!contract || !profileSeller) return;
      setLoading(true);
      try {
        const allListings = await contract.getActiveListings();
        const formatted = allListings
          .map((l, i) => ({
            id: i + 1,
            title: l.title,
            description: l.description,
            storeId: Number(l.storeId),
            category: l.category,
            price: Number(formatUnits(l.price, 18)),
            quantity: Number(l.quantity),
            seller: l.seller,
            paymentToken: l.paymentToken,
            uri: l.uri,
            dateAdded: Number(l.dateAdded) * 1000,
          }))
          .filter((l) => l.seller.toLowerCase() === profileSeller.toLowerCase());
        setListings(formatted);
      } catch (err) {
        console.error("Error fetching seller listings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerListings();
  }, [contract, profileSeller]);

  //pagination
const ITEMS_PER_PAGE = 5; // adjust per your grid
const [currentPage, setCurrentPage] = useState(1);
// Calculate pagination
const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const paginatedItems = filtered.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);


  // ---------------- RENDER ----------------
  return (
    <div className="flex w-full">
      
      {/* Sidebar (Desktop) */}
<aside
  className={`hidden md:block w-64 p-4 border-r overflow-y-auto max-h-screen sticky top-0 
    ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
>
  <div className="flex items-center justify-between mb-3">
    <h2 className={`font-bold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>Categories</h2>
  </div>

  <ul className="space-y-1">
    {categories.map((c) => {
      const categoryObj = CATEGORIES.find((cat) => cat.name === c);
      const isActive = category === c;

      return (
        <li
          key={c}
          className={`cursor-pointer p-2 rounded transition-colors
            ${
              isActive
                ? "bg-green-600 text-white"
                : darkMode
                ? "hover:bg-gray-700 text-gray-200"
                : "hover:bg-gray-200 text-gray-900"
            }`}
          onClick={() => setCategory(c)}
        >
          {categoryObj?.symbol && <span className="mr-1">{categoryObj.symbol}</span>}
          {c}
        </li>
      );
    })}
  </ul>
</aside>


{/* Sidebar (Mobile Drawer) */}
{sidebarOpen && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden">
    <div
      className={`absolute left-0 top-0 w-80 h-full shadow-2xl p-5 overflow-y-auto flex flex-col
        ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"}`}
    >
      {/* Close Button */}
      <button
        onClick={() => setSidebarOpen(false)}
        className={`mb-5 flex items-center gap-2 transition-colors
          ${darkMode ? "text-red-400 hover:text-red-200" : "text-red-600 hover:text-red-400"}`}
      >
        <X size={22} /> Close
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-bold text-xl tracking-wide ${darkMode ? "text-gray-200" : "text-gray-900"}`}>Categories</h2>
      </div>

      {/* Category List */}
      <ul className="flex-1 space-y-3">
        {categories.map((c) => {
          const categoryObj = CATEGORIES.find((cat) => cat.name === c);
          const isActive = category === c;

          return (
            <li
              key={c}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${
                  isActive
                    ? "bg-green-600 text-white font-bold shadow-md"
                    : darkMode
                    ? "hover:bg-gray-700 hover:text-gray-200"
                    : "hover:bg-gray-200 hover:text-gray-900"
                }`}
              onClick={() => {
                setCategory(c);
                setSidebarOpen(false);
              }}
            >
              {categoryObj?.symbol && <span className="text-lg">{categoryObj.symbol}</span>}
              <span>{c}</span>
            </li>
          );
        })}
      </ul>

      {/* Optional Footer */}
      <div className={`mt-6 text-sm opacity-80 ${darkMode ? "text-green-300" : "text-green-600"}`}>
        Select a category to filter listings
      </div>
    </div>
  </div>
)}



{/* Main Content */}
<div className={`flex-1 p-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
  {/* Controls */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
    {/* Search */}
    <div className={`flex items-center border rounded px-2 py-1 w-full md:w-1/3 ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
      <Search size={18} className={`mr-2 ${darkMode ? "text-gray-300" : "text-gray-500"}`} />
      <input
        type="text"
        placeholder="Search listings (title/store/category/desc/token)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`w-full outline-none p-1 rounded ${darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-900"}`}
      />
    </div>

    {/* Mobile Category Toggle */}
    <div className="flex items-center gap-2">
      <button
        className={`md:hidden p-2 border rounded flex items-center gap-2 ${darkMode ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-900"}`}
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={18} /> Categories
      </button>

      {/* Sort + Layout */}
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className={`border rounded px-2 py-1 ${darkMode ? "bg-gray-700 border-gray-700 text-gray-200" : "bg-white border-gray-300 text-gray-900"}`}
      >
        <option value="recent">Recent</option>
        <option value="earliest">Earliest</option>
        <option value="a-z">A - Z</option>
        <option value="z-a">Z - A</option>
        <option value="token">Token Name</option>
      </select>

      <button onClick={() => setLayout("grid1")} className={`p-2 border rounded ${darkMode ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-900"}`}><List size={18} /></button>
      <button onClick={() => setLayout("grid2")} className={`p-2 border rounded ${darkMode ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-900"}`}><Grid size={18} /></button>
      <button onClick={() => setLayout("grid3")} className={`p-2 border rounded ${darkMode ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-900"}`}><LayoutGrid size={18} /></button>
    </div>
  </div>

  {/* Product Grid */}
{!profileSeller && (
  <div className={`grid ${gridClass} gap-6`}>
    {paginatedItems.map((l) => (
      <div
        key={l.id}
        className={`border rounded-xl shadow-md overflow-hidden flex flex-col transition hover:shadow-lg cursor-pointer
          ${darkMode ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
        onClick={() => setSelected(l)}
      >
        {/* Image */}
        <img
          src={l.uri}
          alt={l.title}
          className="h-44 object-cover w-full"
        />

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Title + Excerpt */}
          <h3 className="font-bold text-md mb-1 truncate capitalize">{l.title}</h3>
          {/* Store name or fallback */}

           {/* Category + Store block (icon above badge, with shadow) */}
<div className="mt-2 flex items-start gap-3">
  {/* Icon circle (folder) */}
  <div
    className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md flex-shrink-0
      ${darkMode ? "bg-indigo-900/40" : "bg-indigo-50"}
    `}
    aria-hidden="true"
    title={l.category || "Uncategorized"}
  >
    <Folder className={`w-5 h-5 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`} />
  </div>

  {/* Text column: badge + store name/id */}
  <div className="flex-1 min-w-0">
    {/* Category badge (pill) */}
    <div className="flex items-center gap-2">
      <span
        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full shadow-sm truncate
          ${darkMode ? "bg-indigo-800/60 text-indigo-200" : "bg-indigo-100 text-indigo-700"}
        `}
        style={{ boxShadow: darkMode ? "0 6px 18px rgba(15,23,42,0.35)" : "0 6px 18px rgba(79,70,229,0.06)" }}
      >
        {/* ensure first letter uppercase */}
        {(l.category || "Uncategorized").toString().replace(/^\w/, (c) => c.toUpperCase())}
      </span>
    </div>

    {/* Store name (highlighted) and Store ID */}
    <div className="mt-1 flex items-center justify-between">
      <div className={`text-sm font-medium truncate ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}>
       {l.storeName && l.storeName.trim() !== "" ? l.storeName : `Store #${l.storeId}`}
      </div>
    </div>
  </div>
</div>


          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 first-letter:uppercase my-2">
            {l.description || "No description available"}
          </p>

          {/* Store Info */}
          {l.storeName && (
            <div className="text-xs italic text-gray-500 dark:text-gray-400 mb-2">
              {l.storeName}
            </div>
          )}
     
            {/* Quantity + Price */}
<div className="flex justify-between items-center mt-auto">
  <span className="text-xs text-gray-600 dark:text-gray-400">
    Qty: {l.quantity}
  </span>
  <span className="text-base font-semibold flex items-center gap-2">
    {l.price}
    {TOKEN_LOGOS && TOKEN_LOGOS[l.paymentToken] ? (
      <span className="flex items-center gap-1">
       {TOKEN_LOGOS[l.paymentToken].name}
        <img
          src={TOKEN_LOGOS[l.paymentToken].logo}
          alt=""
          className="w-4 h-4 inline-block"
        />
      </span>
    ) : (
      l.paymentToken
    )}
  </span>
</div>


          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(l.id); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
            >
              Edit
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); deactivateListing(l.id); }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
            >
              Deactivate
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); cancelListingIfNoSales(l.id); }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
            >
              Cancel
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); createOrderRequest(l.id); }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
            >
              Request
            </button>

<button
  onClick={(e) => {
    e.stopPropagation();
    openConfirmModal(order);
  }}
  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
>
  Confirm & Pay
</button>


             <button
             onClick={(e) => { e.stopPropagation(); openShippingModal(l.id); }}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
             >
             Set Shipping
             </button>
             
          </div>
        </div>
      </div>
    ))}
  </div>
  )}
{/* Pagination */}
{totalPages > 1 && (
  <div className="mt-20 flex justify-center items-center gap-2 flex-wrap">
    {/* Prev Button */}
    <button
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className={`px-4 py-2 rounded-lg border cursor-pointer transition-colors
        ${darkMode
          ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        }`}
    >
      Prev
    </button>

    {/* Page Numbers */}
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        className={`px-4 py-2 rounded-lg border cursor-pointer font-medium transition-colors
          ${page === currentPage
            ? "bg-blue-500 border-blue-500 text-white"
            : darkMode
              ? "border-gray-700 text-gray-200 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-200"
          }`}
      >
        {page}
      </button>
    ))}

    {/* Next Button */}
    <button
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className={`px-4 py-2 rounded-lg border cursor-pointer transition-colors
        ${darkMode
          ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        }`}
    >
      Next
    </button>
  </div>
)}




        {/* Edit Modal */}
{editModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/50"
      onClick={() => setEditModalOpen(false)}
    />

    {/* Modal content */}
    <div className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-xl">
      <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        ✏️ <span className="text-yellow-600 dark:text-yellow-400">Edit Listing #{editingListingId}</span>
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Price
          </label>
          <input
            type="number"
            step="0.0001"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Quantity
          </label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setEditModalOpen(false)}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        >
          Cancel
        </button>
        <button
          onClick={() => updateListing(editingListingId, form)}
          disabled={loadingAction}
          className="px-4 py-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-500 disabled:opacity-50 transition"
        >
          {loadingAction ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  </div>
)}




    {/* // ----------------SINGLE PRODUCT AND SELLER PROFILE MODAL ---------------- */}
    <div className={`${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>

      {/* ---------------- SINGLE PRODUCT MODAL ---------------- */}
{selected && !profileSeller && (
  <div className="fixed p-6 inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className={`p-6 rounded-2xl w-full max-w-2xl relative overflow-y-auto max-h-screen shadow-xl
        ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}
      `}
    >
      {/* Close Button */}
      <button
        onClick={() => setSelected(null)}
        className={`absolute top-3 right-3 rounded-full p-1 transition-colors
          ${darkMode ? "text-gray-400 hover:text-white bg-gray-800" : "text-gray-500 hover:text-black bg-gray-100"}
        `}
      >
        <X size={20} />
      </button>

      {/* Product Image */}
      <img
        src={selected.uri}
        alt=""
        className="h-60 object-cover rounded-lg mb-4 w-full shadow-sm"
      />

      {/* Product Title */}
      <h2 className="text-2xl font-bold mb-1 capitalize">{selected.title}</h2>
      <p className="text-sm mb-3 first-letter:uppercase">{(selected.description || "").slice(0, 120)}...</p>

      {/* Store Info */}
{/* Category + Store block (icon above badge, with shadow) */}
<div className="mt-4 flex items-start gap-3">
  {/* Icon circle (folder) */}
  <div
    className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md flex-shrink-0
      ${darkMode ? "bg-indigo-900/40" : "bg-indigo-50"}
    `}
    aria-hidden="true"
    title={selected.category || "Uncategorized"}
  >
    <Folder className={`w-5 h-5 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`} />
  </div>

  {/* Text column: badge + store name/id */}
  <div className="flex-1 min-w-0">
    {/* Category badge (pill) */}
    <div className="flex items-center gap-2">
      <span
        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full shadow-sm truncate
          ${darkMode ? "bg-indigo-800/60 text-indigo-200" : "bg-indigo-100 text-indigo-700"}
        `}
        style={{ boxShadow: darkMode ? "0 6px 18px rgba(15,23,42,0.35)" : "0 6px 18px rgba(79,70,229,0.06)" }}
      >
        {(selected.category || "Uncategorized").toString().replace(/^\w/, (c) => c.toUpperCase())}
      </span>
    </div>

    {/* Store name (highlighted) and Store ID */}
    <div className="mt-1 flex items-center justify-between">
      <div className={`text-sm font-medium truncate ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}>
        {selected.storeName && selected.storeName.trim() !== "" 
          ? `${selected.storeName} Store #${selected.storeId}` 
          : `Store #${selected.storeId}`}
      </div>
    </div>
  </div>
</div>

      {/* Quantity + Price */}
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm">Qty: {selected.quantity}</span>
        <span className="text-lg font-semibold flex items-center gap-2">
          {selected.price}
          {TOKEN_LOGOS && TOKEN_LOGOS[selected.paymentToken] ? (
            <span className="flex items-center gap-1">
              {TOKEN_LOGOS[selected.paymentToken].name}
              <img
                src={TOKEN_LOGOS[selected.paymentToken].logo}
                alt=""
                className="w-5 h-5"
              />
            </span>
          ) : (
            selected.paymentToken
          )}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=I'm interested in ${selected.title}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          <MessageCircle size={18} /> WhatsApp
        </a>

        {/* VeryMarket Chat */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <MessageSquare size={18} /> VeryMarket Chat
        </button>

        {/* View Seller Profile */}
        <button
          onClick={() => setProfileSeller(selected.seller)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}
          `}
        >
          <UserCircle size={18} /> View Seller Profile
        </button>

        {/* Edit */}
        <button
          onClick={() => openEditModal(selected.id)}
          className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
        >
          Edit
        </button>

        {/* Deactivate */}
        <button
          onClick={() => deactivateListing(selected.id)}
          className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          Deactivate
        </button>

        {/* Cancel */}
        <button
          onClick={() => cancelListingIfNoSales(selected.id)}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Cancel
        </button>

        {/* Request */}
        <button
          onClick={() => createOrderRequest(selected.id)}
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Request
        </button>

        {/* Confirm & Pay */}
        <button
          onClick={() => buyerConfirmAndPay(selected.id)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Confirm & Pay
        </button>
      </div>
    </div>
  </div>
)}


      {/* ---------------- SELLER PROFILE MODAL ---------------- */}
      {profileSeller && (
        <div className="fixed p-6 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow p-6 w-full max-w-4xl max-h-screen overflow-y-auto relative
            ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"}
          `}>
            {/* Close Button */}
            <button
              onClick={() => setProfileSeller(null)}
              className={`absolute top-2 right-2 ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
            >
              <X size={24} />
            </button>

            {/* Header */}
            <h1 className="text-2xl font-bold mb-2">Seller Profile</h1>
            <p className={`break-words mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Address: <span className="font-mono">{profileSeller}</span>
            </p>

            {loading ? (
              <p>Loading seller listings...</p>
            ) : listings.length === 0 ? (
              <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>No active listings found for this seller.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className={`border rounded-lg shadow-sm p-3 flex flex-col
                      ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}
                    `}
                  >
                    <img src={l.uri} alt={l.title} className="h-40 object-cover rounded mb-2" />
                    <h3 className="font-bold">{l.title}</h3>
                    <p className={`text-sm mb-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {(l.description || "").slice(0, 60)}...
                    </p>
                    <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Store #{l.storeId}</div>
                    <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Qty: {l.quantity}</div>
                    <div className="text-sm font-semibold mt-1 flex items-center gap-1">
                      {l.price}{" "}
                      {TOKEN_LOGOS && TOKEN_LOGOS[l.paymentToken] ? (
                        <img src={TOKEN_LOGOS[l.paymentToken]} alt={l.paymentToken} className="w-4 h-4 inline" />
                      ) : (
                        l.paymentToken
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

{/* confirm modal */}
<ConfirmModal
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  title={confirmConfig.title}
  message={confirmConfig.message}
  onConfirm={confirmConfig.onConfirm}
/>

{/* Input modal */}
<InputModal
  isOpen={inputOpen}
  onClose={() => setInputOpen(false)}
  title={inputConfig?.title}
  fields={inputConfig?.fields}
  onSubmit={inputConfig?.onSubmit}
/>

{/* set shipping modal */}
      <ShippingModal
        isOpen={shippingModalOpen}
        onClose={() => setShippingModalOpen(false)}
        onConfirm={sellerSetShipping}
        orderId={selectedOrderId}
        darkMode={darkMode}
      />

 {/* Attach modal to buyerConfirmAndPay */}
<BuyerConfirmPayModal
  isOpen={confirmModalOpen}
  onClose={() => setConfirmModalOpen(false)}
  orderId={selectedOrder?.id}
  paymentToken={selectedOrder?.paymentToken}
  total={selectedOrder?.amount + selectedOrder?.shippingFee}
  onConfirm={buyerConfirmAndPay}
  darkMode={darkMode}
/>



      </div>
    </div>
  );
}




