"use client";
import { useState, useEffect, useMemo } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { Search, Grid, List, LayoutGrid, Menu, X, MessageCircle, MessageSquare, UserCircle, Folder } from "lucide-react";

import Link from "next/link";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import ConfirmModal from "./ConfirmModal";
import InputModal from "./InputModal";
import { motion, AnimatePresence } from "framer-motion";


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
        console.log("Contract init err", err);
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
    { name: "Phones & Tablets", symbol: "📱" },
    { name: "Laptops & PCs", symbol: "💻" },
    { name: "TVs & Displays", symbol: "🖥️" },
    { name: "Headphones & Audio", symbol: "🎧" },
    { name: "Smartwatches & Wearables", symbol: "⌚" },
    { name: "Cameras & Photography", symbol: "📷" },
    { name: "Gaming Consoles", symbol: "🎮" },
    { name: "Accessories", symbol: "🔌" },
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
  ];

  // ---------------- FETCH ACTIVE LISTINGS ----------------
  const loadActiveListings = async () => {
    if (!contract) return;
    try {
      const activeListings = await contract.getActiveListings();
      const formatted = activeListings.map((l, i) => ({
        id: Number(l.id),
        title: l.title,
        description: l.description,
        storeId: Intl.NumberFormat().format(Number(l.storeId)),
        category: l.category,
        price: Number(formatUnits(l.price, 18)),
        quantity: Number(l.quantity),
        initialQuantity:Number(l.initialQuantity),
        seller: l.seller,
        active: l.active,
        paymentToken: l.paymentToken,
        uri: l.uri,
        dateAdded: Number(l.dateAdded) ? Number(l.dateAdded) : "",
      }));
      setListings(formatted);
      setFiltered(formatted);
    } catch (err) {
      console.log("Error fetching listings:", err);
    }
  };

  useEffect(() => {
    loadActiveListings();
  }, [contract]);

    //pagination
const ITEMS_PER_PAGE = 3; // adjust per your grid
const [currentPage, setCurrentPage] = useState(1);
// Calculate pagination
const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const paginatedItems = filtered.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);


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

const openEditModal = async (listingId) => {
  if (!contract) return pushToast("Connect wallet first");
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
    console.log("getListing err", err);
    pushToast("Error loading listing for edit");
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
    console.log("Update error:", err);
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
        console.log("deactivateListing err", err);
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
        console.log("cancelListingIfNoSales err", err);
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
// Create order request
const createOrderRequest = (id) => {
  if (!contract) return pushToast("error", "Connect wallet first");

  askInput(
    "Create an order request",
    [
      { name: "quantity", label: "Quantity", type: "number", placeholder: "Enter quantity" },
      { name: "location", label: "Delivery Location", type: "text", placeholder: "Enter location" },
    ],
    async (values) => {
      try {
        const { quantity, location } = values;
        if (!quantity || !location) return pushToast("error", "All fields required");

        setLoadingAction(true);

        // ✅ Only call createOrderRequest — no ETH/tokens sent here
        const tx = await contract.createOrderRequest(id, quantity, location);
        await tx.wait();

        pushToast("success!" + " " + "Order request created");
        await loadActiveListings();
      } catch (err) {
        console.log("createOrderRequest error", err);
        pushToast("error", "Error creating order request");
      } finally {
        setLoadingAction(false);
      }
    }
  );
};




  // Fetch listings for Seller Profile
  // --- Inside your ListingsTab component ---
const [currentPageOfSeller, setCurrentPageOfSeller] = useState(1);
const [itemsPerPage] = useState(3);

// --- Fetch seller listings ---
useEffect(() => {
  const fetchSellerListings = async () => {
    if (!contract || !profileSeller) return;
    setLoading(true);
    try {
      const allListings = await contract.getActiveListings();
      const formatted = allListings
        .map((l, i) => ({
          id: Number(l.id),
          title: l.title,
          description: l.description,
          storeId: Intl.NumberFormat().format(Number(l.storeId)),
          category: l.category,
          price: Number(formatUnits(l.price, 18)),
          quantity: Number(l.quantity),
          initialQuantity:Number(l.initialQuantity),
          seller: l.seller,
          active: l.active,
          paymentToken: l.paymentToken,
          uri: l.uri,
          dateAdded: Number(l.dateAdded) ? Number(l.dateAdded) : "",
        }))
      .filter((l) => l.seller.toLowerCase() === profileSeller.toLowerCase())
      .sort((a, b) => b.dateAdded - a.dateAdded);
      setListings(formatted);
      setCurrentPageOfSeller(1); // Reset pagination whenever new seller opens
    } catch (err) {
      console.log("Error fetching seller listings:", err);
    } finally {
      setLoading(false);
    }
  };
  fetchSellerListings();
}, [contract, profileSeller]);

// --- Pagination helpers ---
const indexOfLastItem = currentPageOfSeller * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const paginatedItemsOfSeller = listings.slice(indexOfFirstItem, indexOfLastItem);
const totalPagesOfSeller = Math.ceil(listings.length / itemsPerPage);

const goToNextPage = () => {
  if (currentPageOfSeller < totalPagesOfSeller) setCurrentPageOfSeller((prev) => prev + 1);
};
const goToPrevPage = () => {
  if (currentPageOfSeller > 1) setCurrentPageOfSeller((prev) => prev - 1);
};
const goToPage = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPagesOfSeller) {
    setCurrentPageOfSeller(pageNumber);
  }
};


// State for store details
const [store, setStore] = useState(null);
const [loadingStore, setLoadingStore] = useState(false);

// Fetch store details
useEffect(() => {
  const fetchStore = async () => {
    if (!contract || !profileSeller) return;
    setLoadingStore(true);
    try {
      const s = await contract.getStoreByAddress(profileSeller); // <-- assuming contract exposes this
      const formattedStore = {
        id: Number(s.id),
        owner: s.owner,
        name: s.name,
        description: s.description,
        location: s.location,
        phoneNumber: s.phoneNumber,
        image: s.image,
        positiveRatings: Number(s.positiveRatings),
        negativeRatings: Number(s.negativeRatings),
        exists: s.exists,
      };
      setStore(formattedStore);
    } catch (err) {
      console.log("Error fetching store:", err);
      setStore(null);
    } finally {
      setLoadingStore(false);
    }
  };

  fetchStore();
}, [contract, profileSeller]);


//for chat with store owner
  const [showToast, setShowToast] = useState(false);
  const handleChatClick = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };


  //for store exists button
  const [myStore, setMyStore] = useState(null);
  const [loadingMyStore, setLoadingMyStore] = useState(false);

  useEffect(() => {
  const fetchMyStore = async () => {
    if (!contract || !address) return;
    setLoadingMyStore(true);
    try {
      const s = await contract.getStoreByAddress(address);
      const formattedStore = {
        id: Number(s.id),
        owner: s.owner,
        name: s.name,
        description: s.description,
        location: s.location,
        phoneNumber: s.phoneNumber,
        image: s.image,
        positiveRatings: Number(s.positiveRatings),
        negativeRatings: Number(s.negativeRatings),
        exists: s.exists,
      };
      setMyStore(formattedStore);
    } catch (err) {
      console.log("Error fetching connected wallet store:", err);
      setMyStore(null);
    } finally {
      setLoadingMyStore(false);
    }
  };

  fetchMyStore();
}, [contract, address]);

  if (!walletProvider) {
    return <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>Please connect your wallet to view listings.</div>;
  }


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

  {/* View Your Listings Button */}
{myStore?.exists && myStore?.owner?.toLowerCase() === address?.toLowerCase() && (
  <div className="mb-6">
    <button
      onClick={() => setProfileSeller(address)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full shadow transition
        ${darkMode ? "bg-indigo-700 hover:bg-indigo-600 text-white" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"}`}
    >
      <UserCircle size={18} /> View your Listings
    </button>
  </div>
)}



{/* Product Grid */}
{!profileSeller && (
  <motion.div
    layout
    className={`grid ${gridClass} gap-6`}
  >
    {filtered.length === 0 && (
    <p className="text-gray-500 text-center mt-6">No listings found.</p>)}
    {paginatedItems.map((l, idx) => (
      <motion.div
        key={l.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * idx, duration: 0.3, ease: "easeInOut" }}
        className={`border rounded-xl shadow-md overflow-hidden flex flex-col transition hover:shadow-lg cursor-pointer
          ${darkMode ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900"}`}
        onClick={() => setSelected(l)}
      >
        {/* Image */}
        <img
          src={l.uri}
          alt={l.title}
          className="h-50 object-cover w-full"
        />

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Title + Excerpt */}
          <h3 className="font-bold text-lg mb-1 truncate capitalize">{l.title}</h3>
          {l.dateAdded && (
            <div className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Added: {new Date(Number(l.dateAdded) * 1000).toLocaleString()}
            </div>
          )}

          {/* Category + Store block */}
          <div className="mt-2 flex items-start gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-md flex-shrink-0
                ${darkMode ? "bg-indigo-900/40" : "bg-indigo-50"}`}
              aria-hidden="true"
              title={l.category || "Uncategorized"}
            >
              <Folder className={`w-5 h-5 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full shadow-sm truncate
                    ${darkMode ? "bg-indigo-800/60 text-indigo-200" : "bg-indigo-100 text-indigo-700"}`}
                  style={{ boxShadow: darkMode ? "0 6px 18px rgba(15,23,42,0.35)" : "0 6px 18px rgba(79,70,229,0.06)" }}
                >
                  {(l.category || "Uncategorized").toString().replace(/^\w/, (c) => c.toUpperCase())}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className={`text-sm font-medium truncate ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}>
                  {l.storeName?.trim() ? l.storeName : `Store #${l.storeId.toString().padStart(3, "0")}`}
                </div>
              </div>
            </div>
          </div>

          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"} line-clamp-2 first-letter:uppercase my-2`}>
            {l.description || "No description available"}
          </p>

{/* Quantity + Price */}
<div className="flex justify-between items-center gap-2 mt-auto">
  {/* Status Badge */}
  <div>
    {l.active === true && l.quantity > 0 ? (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        Active • {l.quantity} left out of {l.initialQuantity}
      </span>
    ) : !l.active === true ? (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        Inactive
      </span>
    ) : (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Sold Out • {l.initialQuantity} listed
      </span>
    )}
  </div>

  {/* Price + Token */}
  <span className="text-base font-semibold flex items-center gap-2">
    {l.price}
    {TOKEN_LOGOS?.[l.paymentToken] ? (
      <span className="flex items-center gap-1">
        {TOKEN_LOGOS[l.paymentToken].name}
        <img
          src={TOKEN_LOGOS[l.paymentToken].logo}
          alt=""
          className="w-4 h-4 inline-block"
        />
      </span>
    ) : l.paymentToken}
  </span>
</div>


{/* Actions */}
<div className="mt-4 flex flex-wrap gap-2">
  {/* Seller Actions */}
  {l.seller?.toLowerCase() === address?.toLowerCase() && (
    <>
      {/* Edit if active */}
      {l.active && (
        <button
          onClick={(e) => { e.stopPropagation(); openEditModal(l.id); }}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
        >
          Edit
        </button>
      )}

      {/* Deactivate if active */}
      {l.active && (
        <button
          onClick={(e) => { e.stopPropagation(); deactivateListing(l.id); }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
        >
          Deactivate
        </button>
      )}

      {/* Cancel if active and no sales yet */}
      {l.active && Number(l.initialQuantity - l.quantity || 0) === 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); cancelListingIfNoSales(l.id); }}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
        >
          Cancel
        </button>
      )}
    </>
  )}

  {/* Buyer Actions */}
  {l.seller?.toLowerCase() !== address?.toLowerCase() && l.active && l.quantity > 0 && (
    <button
      onClick={(e) => { e.stopPropagation(); createOrderRequest(l.id); }}
      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
    >
      Request
    </button>
  )}
</div>


        </div>
      </motion.div>
    ))}
  </motion.div>
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
          ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
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
          ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        }`}
    >
      Next
    </button>
  </div>
)}




        {/* Edit Modal */}
{editModalOpen && (
  <AnimatePresence>
    {editModalOpen && (
      <motion.div
        className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setEditModalOpen(false)}
        />

        {/* Modal content */}
        <motion.div
          className="relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            onClick={() => setEditModalOpen(false)}
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ✏️{" "}
            <span className="text-yellow-600 dark:text-yellow-400">
              Edit Listing #{editingListingId}
            </span>
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
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
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
        className="object-cover rounded-lg mb-4 w-full shadow-sm"
      />

      {/* Product Title */}
      <h2 className="text-2xl font-bold mb-1 capitalize">{selected.title}</h2>
      <p className={`text-sm mb-3 first-letter:uppercase ${darkMode ? "text-gray-400" : "text-gray-700"}`}>{(selected.description || "")}</p>
      {selected.dateAdded ? (<div className="mt-1 text-sm text-gray-400 dark:text-gray-500">Added: {new Date(Number(selected.dateAdded) * 1000).toLocaleString()}</div>) : ""}
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
          : `Store #${selected.storeId.toString().padStart(3, "0")}`}
      </div>
    </div>
  </div>
</div>


<div className="flex flex-col md:flex-row md:justify-between md:items-center mt-2 mb-5 gap-2">
  {/* Status Badge */}
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {selected.active && selected.quantity > 0 ? (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        Active • {selected.quantity} left out of {selected.initialQuantity}
      </span>
    ) : !selected.active ? (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        Inactive
      </span>
    ) : (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Sold Out • {selected.initialQuantity} listed
      </span>
    )}
  </motion.div>

  {/* Quantity + Price */}
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="flex justify-end"
  >
    <span className="text-lg mt-2 font-semibold flex gap-2 items-center">
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
  </motion.div>
</div>



{/* Action Buttons */}
<motion.div 
  className="flex flex-wrap gap-3 mt-2"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* View Seller Profile */}
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => setProfileSeller(selected.seller)}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
      ${darkMode 
        ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
        : "bg-gray-200 hover:bg-gray-300 text-gray-900"}
    `}
  >
    <UserCircle size={18} /> {selected.seller?.toLowerCase() === address?.toLowerCase()
      ? "View your Profile"
      : "View Seller Profile"}
  </motion.button>

  {/* Seller Actions */}
  {selected.seller?.toLowerCase() === address?.toLowerCase() && (
    <>
      {selected.active && (
        <>
          {/* Edit */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => openEditModal(selected.id)}
            className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            Edit
          </motion.button>

          {/* Deactivate */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => deactivateListing(selected.id)}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Deactivate
          </motion.button>
        </>
      )}

      {/* Cancel (only if no sales yet) */}
      {selected.active && Number(selected.sold || 0) === 0 && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => cancelListingIfNoSales(selected.id)}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </motion.button>
      )}
    </>
  )}

  {/* Buyer Actions */}
  {selected.seller?.toLowerCase() !== address?.toLowerCase() &&
    selected.status === 1 &&
    selected.quantity > 0 && (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => createOrderRequest(selected.id)}
        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        Request
      </motion.button>
  )}
</motion.div>

      
    </div>
  </div>
)}



{/* ---------------- SELLER PROFILE MODAL ---------------- */}
{profileSeller && store?.exists && (
        <AnimatePresence>
          <motion.div
            key="seller-profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setProfileSeller(null);
            }}
          >
            <motion.div
              key="seller-profile-modal"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`relative rounded-xl shadow-lg w-full max-w-5xl max-h-screen overflow-auto mt-[2cm]
                ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}
              `}
            >
              {/* Close Button */}
              <button
                onClick={() => setProfileSeller(null)}
                className={`absolute top-3 right-3 p-2 rounded-full z-50
                  ${
                    darkMode
                      ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                      : "hover:bg-gray-200 text-gray-600 hover:text-black"
                  }
                `}
              >
                <X size={22} />
              </button>

              {/* Loading Store */}
              {loadingStore ? (
                <div className="p-6 text-center">
                  <p className="animate-pulse">Fetching store details...</p>
                </div>
              ) : (
                <>
                  {/* Store Cover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative w-full h-70 rounded-t-xl overflow-hidden"
                  >
                    <img
                      src={store.image || "/default-cover.jpg"}
                      alt="Store Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm">
                      Store #{store.id.toString().padStart(3, "0")}
                    </div>
                  </motion.div>

                  {/* Store Info */}
                  <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-2">{store.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Wallet:{" "}
                      <span className="font-mono">
                        {profileSeller.slice(0, 6)}...{profileSeller.slice(-4)}
                      </span>
                    </p>
                    <p className="mb-3">{store.description}</p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
                    >
                      <p>
                        <span className="font-semibold">📍 Location:</span>{" "}
                        {store.location}
                      </p>
                      <p>
                        <span className="font-semibold">📞 Phone:</span>{" "}
                        {store.phoneNumber}
                      </p>
                      <p>
                        <span className="font-semibold">
                          👍 Positive Ratings:
                        </span>{" "}
                        {store.positiveRatings}
                      </p>
                      <p>
                        <span className="font-semibold">
                          👎 Negative Ratings:
                        </span>{" "}
                        {store.negativeRatings}
                      </p>
                    </motion.div>

                    {/* Chat Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <button
                        onClick={handleChatClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow"
                      >
                        <MessageSquare size={18} /> {store?.owner?.toLowerCase() === address?.toLowerCase() ? "Chat with Buyers" : "Chat with Store Owner"}
                      </button>
                    </motion.div>
                  </div>
                </>
              )}

              {/* Seller Products */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Products</h3>

                {loading ? (
                  <p>Loading seller listings...</p>
                ) : listings.length === 0 ? (
                  <p
                    className={`${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No active listings found for this seller.
                  </p>
                ) : (
                  <motion.div
                    layout
                    className={`grid ${gridClass} gap-6`}
                  >
                    <AnimatePresence initial={false}>
                      {paginatedItemsOfSeller.map((l, idx) => (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{
                            duration: 0.25,
                            delay: 0.05 * idx,
                          }}
                          className={`border cursor-pointer rounded-xl shadow-md overflow-hidden flex flex-col transition hover:shadow-lg
                            ${
                              darkMode
                                ? "bg-gray-800 border-gray-700 text-gray-200"
                                : "bg-white border-gray-200 text-gray-900"
                            }`}
                          onClick={() => {setSelected(l); setProfileSeller(null)}} 
                        >
                          {/* Image */}
                          <img
                            src={l.uri}
                            alt={l.title}
                            className="h-44 object-cover w-full"
                          />

                          {/* Content */}
                          <div className="p-4 flex flex-col flex-grow">
                            <h3 className="font-bold text-lg mb-1 truncate capitalize">
                              {l.title}
                            </h3>
                           {l.dateAdded && (
                            <div className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                             Added: {new Date(Number(l.dateAdded) * 1000).toLocaleString()}
                            </div>
                             )}
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"} line-clamp-2 my-2`}>
                              {l.description ||
                                "No description available"}
                            </p>

                            {/* Quantity + Price */}
                            <div className="flex justify-between items-center gap-2 mt-auto">
{/* Status Badge */}
<div>
  {l.active && l.quantity > 0 ? (
    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-00 dark:bg-green-900 dark:text-green-300">
      Active • {l.quantity} left out of {l.initialQuantity}
    </span>
  ) : !l.active ? (
    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      Inactive
    </span>
  ) : (
    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
      Sold Out • {l.initialQuantity} listed
    </span>
  )}
</div>
                              <span className="text-base font-semibold flex items-center gap-2">
                                {l.price}{" "}
                                {TOKEN_LOGOS &&
                                TOKEN_LOGOS[l.paymentToken] ? (
                                  <span className="flex items-center gap-1">
                                    {TOKEN_LOGOS[l.paymentToken].name}
                                    <img
                                      src={
                                        TOKEN_LOGOS[l.paymentToken].logo
                                      }
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
  {/* Seller Actions */}
  {l.seller?.toLowerCase() === address?.toLowerCase() && (
    <>
      {l.active && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3, ease: "easeInOut" }}
          onClick={(e) => { e.stopPropagation(); openEditModal(l.id); }}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
        >
          Edit
        </motion.button>
      )}

      {l.active && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeInOut" }}
          onClick={(e) => { e.stopPropagation(); deactivateListing(l.id); }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
        >
          Deactivate
        </motion.button>
      )}

      {l.active && Number(l.sold || 0) === 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeInOut" }}
          onClick={(e) => { e.stopPropagation(); cancelListingIfNoSales(l.id); }}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
        >
          Cancel
        </motion.button>
      )}
    </>
  )}

  {/* Buyer Actions */}
  {l.seller?.toLowerCase() !== address?.toLowerCase() && l.active && l.quantity > 0 && (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3, ease: "easeInOut" }}
      onClick={(e) => { e.stopPropagation(); createOrderRequest(l.id); }}
      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
    >
      Request
    </motion.button>
  )}
</div>

                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Pagination */}
                {totalPagesOfSeller > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2 flex-wrap">
                    {/* Prev Button */}
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPageOfSeller === 1}
                      className={`px-4 py-2 rounded-lg border cursor-pointer transition-colors
                        ${
                          darkMode
                            ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      Prev
                    </button>

                    {/* Page Numbers */}
                    {Array.from(
                      { length: totalPagesOfSeller },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-lg border cursor-pointer font-medium transition-colors
                          ${
                            page === currentPageOfSeller
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
                      onClick={goToNextPage}
                      disabled={
                        currentPageOfSeller === totalPagesOfSeller
                      }
                      className={`px-4 py-2 rounded-lg border cursor-pointer transition-colors
                        ${
                          darkMode
                            ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Toast Notification */}
            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  transition={{ duration: 0.3 }}
                  className="fixed top-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg bg-blue-600 text-white text-sm font-medium"
                >
                  💬 Chat with Store Owner — Coming Soon!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
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

      </div>
    </div>
  );
}




