"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import {
  Search,
  Grid,
  List,
  LayoutGrid,
  Menu,
  X,
  MessageCircle,
  MessageSquare,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function ListingsTab({ TOKEN_LOGOS }) {
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

  // Create / Edit listing modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
  const categories = useMemo(() => {
    const set = new Set(listings.map((l) => l.category || "").filter(Boolean));
    return ["All", ...Array.from(set)].sort();
  }, [listings]);

  // ---------------- CONTRACT ACTIONS (LISTINGS) ----------------

  // Create listing
  const createListing = async () => {
    if (!contract) return alert("Connect wallet first");
    // validation
    if (!form.title || !form.price || !form.quantity || !form.storeId) {
      return alert("Please fill title, price, quantity and storeId");
    }
    try {
      setLoadingAction(true);
      const dateAdded = new Date().toISOString();
      const tx = await contract.createListing(
        form.paymentToken,
        parseUnits(form.price.toString(), 18),
        form.title,
        form.uri || "",
        Number(form.quantity),
        Number(form.storeId),
        form.category || "",
        dateAdded,
        form.description || ""
      );
      await tx.wait();
      alert("Listing created ✅");
      setCreateModalOpen(false);
      // reset form
      setForm({
        paymentToken: Object.keys(TOKEN_LOGOS || {})[0] || "0x0000000000000000000000000000000000000000",
        price: "",
        title: "",
        uri: "",
        quantity: "",
        storeId: "",
        category: "",
        description: "",
      });
      await loadActiveListings();
    } catch (err) {
      console.error("createListing err", err);
      alert("Error creating listing");
    } finally {
      setLoadingAction(false);
    }
  };

  // Open edit: fetch listing from contract and prefill
  const openEditModal = async (listingId) => {
    if (!contract) return alert("Connect wallet first");
    try {
      const onChain = await contract.getListing(listingId);
      // mapping onchain Listing (price is raw uint)
      setEditingListingId(listingId);
      setForm({
        paymentToken: onChain.paymentToken,
        price: Number(formatUnits(onChain.price, 18)).toString(),
        title: onChain.title,
        uri: onChain.uri,
        quantity: String(onChain.quantity),
        storeId: String(onChain.storeId),
        category: onChain.category,
        description: onChain.description,
      });
      setEditModalOpen(true);
    } catch (err) {
      console.error("getListing err", err);
      alert("Error loading listing for edit");
    }
  };

  // Update listing
  const updateListing = async () => {
    if (!contract || editingListingId == null) return;
    try {
      setLoadingAction(true);
      const active = true; // allow toggling if you'd like; keeping active true by default here
      const tx = await contract.updateListing(
        editingListingId,
        parseUnits(form.price.toString(), 18),
        active,
        Number(form.quantity)
      );
      await tx.wait();
      alert("Listing updated ✅");
      setEditModalOpen(false);
      setEditingListingId(null);
      await loadActiveListings();
    } catch (err) {
      console.error("updateListing err", err);
      alert("Error updating listing");
    } finally {
      setLoadingAction(false);
    }
  };

  // Deactivate listing
  const deactivateListing = async (id) => {
    if (!contract) return alert("Connect wallet first");
    if (!confirm("Deactivate listing?")) return;
    try {
      setLoadingAction(true);
      const tx = await contract.deactivateListing(id);
      await tx.wait();
      alert("Listing deactivated");
      await loadActiveListings();
    } catch (err) {
      console.error("deactivateListing err", err);
      alert("Error deactivating listing");
    } finally {
      setLoadingAction(false);
    }
  };

  // Cancel listing if no sales
  const cancelListingIfNoSales = async (id) => {
    if (!contract) return alert("Connect wallet first");
    if (!confirm("Cancel listing (only allowed if no sales)?")) return;
    try {
      setLoadingAction(true);
      const tx = await contract.cancelListingIfNoSales(id);
      await tx.wait();
      alert("Listing cancelled");
      await loadActiveListings();
    } catch (err) {
      console.error("cancelListingIfNoSales err", err);
      alert("Error cancelling listing (maybe it has sales)");
    } finally {
      setLoadingAction(false);
    }
  };

  // ---------------- ORDERS (existing flows) ----------------
  const createOrderRequest = async (id) => {
    if (!contract) return alert("Connect wallet first");
    const qtyStr = prompt("Quantity to request:", "1");
    const qty = Number(qtyStr || 0);
    const loc = prompt("Your shipping location (optional):", "");
    if (!qty || qty <= 0) return alert("Invalid quantity");
    try {
      setLoadingAction(true);
      const tx = await contract.createOrderRequest(id, qty, loc || "");
      await tx.wait();
      alert("Order request created ✅");
      await loadActiveListings();
    } catch (err) {
      console.error("createOrderRequest err", err);
      alert("Error creating order request");
    } finally {
      setLoadingAction(false);
    }
  };

  const buyerConfirmAndPay = async (orderId, valueEth = "0") => {
    if (!contract) return alert("Connect wallet first");
    try {
      setLoadingAction(true);
      const tx = await contract.buyerConfirmAndPay(orderId, { value: parseUnits(valueEth.toString(), 18) });
      await tx.wait();
      alert("Payment successful ✅");
    } catch (err) {
      console.error("buyerConfirmAndPay err", err);
      alert("Error confirming & paying");
    } finally {
      setLoadingAction(false);
    }
  };

    // ---------------- CONTRACT ACTIONS ----------------
  const call = async (fn, ...args) => {
    try {
      const tx = await contract[fn](...args);
      await tx.wait();
      alert(`${fn} successful ✅`);
    } catch (err) {
      console.error(err);
      alert(`Error in ${fn}`);
    }
  };

  // Seller actions
  const cancelListing = (id) => call("cancelListing", id);
  const sellerSetShipping = (orderId, tracking) =>
    call("sellerSetShipping", orderId, tracking);
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

  // ---------------- RENDER ----------------
  return (
    <div className="flex w-full">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:block w-64 bg-gray-100 p-4 border-r overflow-y-auto max-h-screen sticky top-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Categories</h2>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
          >
            + Create
          </button>
        </div>

        <ul className="space-y-1">
          {categories.map((c) => (
            <li
              key={c}
              className={`cursor-pointer p-2 rounded ${category === c ? "bg-green-600 text-white" : "hover:bg-gray-200"}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </li>
          ))}
        </ul>
      </aside>

      {/* Sidebar (Mobile Drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden">
          <div className="absolute left-0 top-0 w-64 h-full bg-white shadow p-4 overflow-y-auto">
            <button onClick={() => setSidebarOpen(false)} className="mb-4 flex items-center gap-2 text-red-600">
              <X size={20} /> Close
            </button>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Categories</h2>
              <button onClick={() => setCreateModalOpen(true)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">+ Create</button>
            </div>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li
                  key={c}
                  className={`cursor-pointer p-2 rounded ${category === c ? "bg-green-600 text-white" : "hover:bg-gray-200"}`}
                  onClick={() => {
                    setCategory(c);
                    setSidebarOpen(false);
                  }}
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          {/* Search */}
          <div className="flex items-center border rounded px-2 py-1 w-full md:w-1/3">
            <Search size={18} className="mr-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search listings (title/store/category/desc/token)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none bg-transparent"
            />
          </div>

          {/* Mobile Category Toggle */}
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 border rounded flex items-center gap-2" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} /> Categories
            </button>

            {/* Sort + Layout */}
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded px-2 py-1">
              <option value="recent">Recent</option>
              <option value="earliest">Earliest</option>
              <option value="a-z">A - Z</option>
              <option value="z-a">Z - A</option>
              <option value="token">Token Name</option>
            </select>

            <button onClick={() => setLayout("grid1")} className="p-2 border rounded"><List size={18} /></button>
            <button onClick={() => setLayout("grid2")} className="p-2 border rounded"><Grid size={18} /></button>
            <button onClick={() => setLayout("grid3")} className="p-2 border rounded"><LayoutGrid size={18} /></button>
          </div>
        </div>

        {/* Seller Profile */}
        {profileSeller && (
          <SellerProfile seller={profileSeller} contract={contract} TOKEN_LOGOS={TOKEN_LOGOS} onClose={() => setProfileSeller(null)} />
        )}

        {/* Product Grid */}
        {!profileSeller && (
          <div className={`grid ${gridClass} gap-4`}>
            {filtered.map((l) => (
              <div
                key={l.id}
                className="border rounded-lg shadow-sm p-3 flex flex-col bg-white dark:bg-gray-800 cursor-pointer"
                onClick={() => setSelected(l)}
              >
                <img src={l.uri} alt={l.title} className="h-40 object-cover rounded mb-2" />
                <h3 className="font-bold">{l.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{(l.description || "").slice(0, 60)}...</p>
                <div className="text-xs text-gray-500">Store #{l.storeId}</div>
                <div className="text-xs text-gray-500">Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}</div>
                <div className="text-xs text-gray-500">Qty: {l.quantity}</div>
                <div className="text-sm font-semibold mt-1 flex items-center gap-1">
                  {l.price}{" "}
                  {TOKEN_LOGOS && TOKEN_LOGOS[l.paymentToken] ? (
                    <img src={TOKEN_LOGOS[l.paymentToken]} alt={l.paymentToken} className="w-4 h-4 inline" />
                  ) : (
                    l.paymentToken
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(l.id); }}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                  >
                    Edit
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deactivateListing(l.id); }}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-xs"
                  >
                    Deactivate
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); cancelListingIfNoSales(l.id); }}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); createOrderRequest(l.id); }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                  >
                    Request
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); /* Buyer would call buyerConfirmAndPay on an order id; flow needs order id */ alert("Use Requests -> Confirm & Pay flow (requires order id)"); }}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
                  >
                    Confirm & Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Single Product Modal */}
        {selected && !profileSeller && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl relative overflow-y-auto max-h-screen">
              <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-gray-500 hover:text-black"><X /></button>
              <img src={selected.uri} alt={selected.title} className="h-60 object-cover rounded mb-4 w-full" />
              <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
              <p className="mb-2">{selected.description}</p>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Store #{selected.storeId}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Seller: {selected.seller}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Qty: {selected.quantity}</div>
              <div className="text-lg font-semibold flex items-center gap-1 mb-4">
                {selected.price}{" "}
                {TOKEN_LOGOS && TOKEN_LOGOS[selected.paymentToken] ? (
                  <img src={TOKEN_LOGOS[selected.paymentToken]} alt={selected.paymentToken} className="w-5 h-5 inline" />
                ) : (
                  selected.paymentToken
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <a href={`https://wa.me/?text=I'm interested in ${selected.title}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded">
                  <MessageCircle size={18} /> WhatsApp
                </a>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded">
                  <MessageSquare size={18} /> VeryMarket Chat
                </button>
                <button onClick={() => setProfileSeller(selected.seller)} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">
                  <UserCircle size={18} /> View Seller Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setCreateModalOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-xl">
              <h3 className="text-lg font-bold mb-3">Create Listing</h3>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm">Payment Token</label>
                <select value={form.paymentToken} onChange={(e) => setForm({...form, paymentToken: e.target.value})} className="p-2 border rounded">
                  {Object.entries(TOKEN_LOGOS || {}).map(([addr, meta]) => (
                    <option key={addr} value={addr}>{meta.name}</option>
                  ))}
                </select>

                <label className="text-sm">Title</label>
                <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Price</label>
                <input value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="p-2 border rounded" placeholder="decimal, e.g. 0.1" />

                <label className="text-sm">Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Store ID (must be your store id)</label>
                <input value={form.storeId} onChange={(e) => setForm({...form, storeId: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Category</label>
                <input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Image URI</label>
                <input value={form.uri} onChange={(e) => setForm({...form, uri: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="p-2 border rounded" rows={4} />
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => createListing()} disabled={loadingAction} className="bg-blue-600 text-white px-4 py-2 rounded">{loadingAction ? "Creating..." : "Create"}</button>
                <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setEditModalOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-xl">
              <h3 className="text-lg font-bold mb-3">Edit Listing #{editingListingId}</h3>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm">Price</label>
                <input value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Title</label>
                <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Category</label>
                <input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Image URI</label>
                <input value={form.uri} onChange={(e) => setForm({...form, uri: e.target.value})} className="p-2 border rounded" />

                <label className="text-sm">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="p-2 border rounded" rows={3} />
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => updateListing()} disabled={loadingAction} className="bg-blue-600 text-white px-4 py-2 rounded">{loadingAction ? "Updating..." : "Update"}</button>
                <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded border">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- SELLER PROFILE COMPONENT ----------------
function SellerProfile({ seller, contract, TOKEN_LOGOS, onClose }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerListings = async () => {
      if (!contract || !seller) return;
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
          .filter((l) => l.seller.toLowerCase() === seller.toLowerCase());
        setListings(formatted);
      } catch (err) {
        console.error("Error fetching seller listings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerListings();
  }, [contract, seller]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <button onClick={onClose} className="mb-4 text-sm text-blue-600 hover:underline">← Back to Listings</button>
      <h1 className="text-2xl font-bold mb-2">Seller Profile</h1>
      <p className="text-gray-600 dark:text-gray-400 break-words mb-4">Address: <span className="font-mono">{seller}</span></p>

      {loading ? (
        <p>Loading seller listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500">No active listings found for this seller.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="border rounded-lg shadow-sm p-3 flex flex-col bg-white dark:bg-gray-800">
              <img src={l.uri} alt={l.title} className="h-40 object-cover rounded mb-2" />
              <h3 className="font-bold">{l.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{(l.description || "").slice(0, 60)}...</p>
              <div className="text-xs text-gray-500">Store #{l.storeId}</div>
              <div className="text-xs text-gray-500">Qty: {l.quantity}</div>
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
  );
}
