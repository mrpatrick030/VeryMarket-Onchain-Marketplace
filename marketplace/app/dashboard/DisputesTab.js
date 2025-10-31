"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import {
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Package,
  Timer,
  MapPin,
  MessageSquareText,
  ThumbsUp,
  ThumbsDown,
  User,
  Store,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "./ConfirmModal";
import InputModal from "./InputModal";
import ChatModal from "./ChatModal";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import ViewReceiptModal from "./ViewReceiptModal";

export default function DisputesTab({ pushToast, TOKEN_LOGOS = {}, STATUS = [], darkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { address } = useWeb3ModalAccount();

  const [contract, setContract] = useState(null);
  const [mediator, setMediator] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dropdown and search states
const [dropdownOpen, setDropdownOpen] = useState(false);
const [selectedStatus, setSelectedStatus] = useState("All");
const [searchTerm, setSearchTerm] = useState("");
const dropdownRef = useRef(null);

// Filter logic
const filteredDisputes = useMemo(() => {
  let data = disputes;

  // Status filter
  if (selectedStatus === "Disputed") data = data.filter((o) => o.status === 5);
  if (selectedStatus === "Dispute Resolved") data = data.filter((o) => o.status === 9);

  // Search filter
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    data = data.filter(
      (o) =>
        o.id.toString().includes(term) ||
        o.title?.toLowerCase().includes(term) ||
        o.buyerLocation?.toLowerCase().includes(term) ||
        o.buyer?.toLowerCase().includes(term) ||
        o.seller?.toLowerCase().includes(term)
    );
  }

  return data;
}, [disputes, selectedStatus, searchTerm]);

// Pagination (filteredDisputes)
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 10;
const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredDisputes.length);
const totalPages = Math.max(1, Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE));
const paginated = useMemo(() => {
  const s = (currentPage - 1) * ITEMS_PER_PAGE;
  return filteredDisputes.slice(s, s + ITEMS_PER_PAGE);
}, [filteredDisputes, currentPage]);


    //Input modal for resolving dispute
  const [inputOpen, setInputOpen] = useState(false);
  const [inputConfig, setInputConfig] = useState({ title: "", fields: [], onSubmit: () => {} });

  // modals & chat
  const [resolveOpen, setResolveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => {} });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundToBuyer, setRefundToBuyer] = useState("");
  const [payoutToSeller, setPayoutToSeller] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatWith, setChatWith] = useState(null);

  // framer variants
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const cardVariants = { hidden: { opacity: 0, y: 12, scale: 0.99 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } } };

  // Inline modal (resolve)
  function InlineModal({ open, onClose, children }) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.18 }} className={`relative w-full max-w-md rounded-2xl shadow-lg p-6 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}>
              <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // init contract + mediator
  useEffect(() => {
    if (!walletProvider) return;
    (async () => {
      try {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const c = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        setContract(c);
        try {
          const med = await c.mediator();
          setMediator(med);
        } catch (err) {
          console.log("mediator not present/readable:", err?.message || err);
        }
      } catch (err) {
        console.log("contract init: ", err);
      }
    })();
  }, [walletProvider]);

  // load disputes from contract
  const [refresh, setRefresh] = useState(false)
  const loadDisputes = async () => {
    if (!contract) return;
    if (refresh === false) {
       setLoading(true)
     }
    try {
      const raw = await contract.getAllDisputes();
      // normalize like orders
      const normalized = raw.map((o) => ({
        id: Number(o.id),
        buyer: o.buyer,
        seller: o.seller,
        listingId: Number(o.listingId),
        storeId: Number(o.storeId),
        paymentToken: o.paymentToken,
        amountRaw: o.amount,
        amount: Number(formatUnits(o.amount, 18)),
        quantity: Number(o.quantity),
        shippingFeeRaw: o.shippingFee,
        shippingFee: Number(formatUnits(o.shippingFee, 18)),
        etaDays: Number(o.estimatedDeliveryDays || 0),
        buyerLocation: o.buyerLocation,
        status: Number(o.status),
        uri: o.uri,
        title: o.title,
        disputeInitiator: o.disputeInitiator,
        previousStatusBeforeDispute: o.previousStatusBeforeDispute ?? o.previousStatus, // try both
        fundsEscrowed: o.fundsEscrowed,
        completed: o.completed,
        buyerComment: o.buyerComment,
        rated: o.rated,
        createdAt: Number(o.createdAt) ? Number(o.createdAt) * 1000 : null,
        receiptTokenId: o.receiptTokenId, 
        receiptURI: o.receiptURI,
      })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setDisputes(normalized);
      setCurrentPage(1);
    } catch (err) {
      console.log("loadDisputes err", err);
      pushToast?.("error", "Failed to load disputes"); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) loadDisputes();
    setRefresh(true)
      // update every 90s
    const interval = setInterval(() => {
      loadDisputes();
    }, 120000)
    return () => clearInterval(interval);
  }, [contract]);

  // helpers: confirm modal
  const askConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  };


  // Cancel dispute (buyer or seller)
  const handleCancelDispute = async (order) => {
    askConfirm("Cancel Dispute", "Are you sure you want to cancel this dispute?", async () => {
      try {
        setLoading(true);
        const tx = await contract.cancelDispute(order.id);
        await tx.wait();
        pushToast?.("success", "Dispute cancelled");
      } catch (err) {
        console.log("cancelDispute err", err);
        pushToast?.("error", "Failed to cancel dispute");
      } finally {
        setLoading(false);
      }
    });
  };

  // handleResolve by mediator
  const handleResolve = (order, tokenName) => {
  setSelectedOrder(order);
  setInputConfig({
    title: `Resolve Dispute - Order #${order.id}`,
    fields: [
      {
        name: "refundAmount",
        label: `Refund to Buyer (${tokenName})`,
        type: "number",
        placeholder: "e.g. 0.5",
      },
      {
        name: "sellerPayout",
        label: `Payout to Seller (${tokenName})`,
        type: "number",
        placeholder: "e.g. 1.0",
      },
    ],
    onSubmit: async (values) => {
      if (!contract) return pushToast?.("error", "Wallet not connected");

      try {
        setLoading(true);

        // Step 1 — Prepare on-chain values
        const refundWei = parseUnits(values.refundAmount.toString() || "0", 18);
        const payoutWei = parseUnits(values.sellerPayout.toString() || "0", 18);

        // Step 2 — Build NFT metadata for the receipt
        const metadata = {
          name: `Order #${order.id} Dispute Resolution`,
          description: `Resolution record for order #${order.id}.`,
          image: order.uri || "/default-receipt.png", // optional image field
          attributes: [
            { trait_type: "Buyer", value: order.buyer },
            { trait_type: "Seller", value: order.seller },
            { trait_type: "Title", value: order.title },
            { trait_type: "Store Id", value: (Intl.NumberFormat().format(order.storeId).toString()).padStart(3, "0") },
            { trait_type: "Token", value: tokenName },
            { trait_type: "Refund To Buyer", value: values.refundAmount },
            { trait_type: "Payout To Seller", value: values.sellerPayout },
            { trait_type: "Status", value: "Dispute Resolved" },
            { trait_type: "Dispute resolved", value: new Date().toLocaleString() },
          ],
        };

        // Step 2: Send metadata to Hedera File Service (HFS) API
        const uploadRes = await fetch("/api/uploadHFSMetadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });

        const { success, fileId } = await uploadRes.json();
        if (!success || !fileId) {
          return console.log("Failed to upload metadata to HFS");
        }

        // Step 3 — Call contract with fileId
        const tx = await contract.resolveDispute(order.id, refundWei, payoutWei, fileId);
        await tx.wait();

        pushToast?.("success", "✅ Dispute resolved and receipt NFT minted!");
      } catch (err) {
        console.log("resolveDispute error:", err);
        pushToast?.("error", err?.message || "Failed to resolve dispute");
      } finally {
        setLoading(false);
      }
    },
  });
  setInputOpen(true);
};

  // formatting date
  const displayDate = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  };

    //for the receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const openReceiptModal = (order) => {
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };
  
  const closeReceiptModal = () => {
    setSelectedOrder(null);
    setShowReceiptModal(false);
  };

  // If wallet not connected
  if (!address) {
    return <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>Please connect your wallet to view disputes.</div>;
  }

  return (
    <div className={`space-y-6 p-5 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}>
{/* Header */}
<div className="flex flex-wrap items-center justify-between mb-2 gap-3">
  {/* Left side: title */}
  <h2 className="text-xl font-bold">⚖️ Disputes</h2>

  {/* Right side: controls */}
  <div className="flex items-center gap-3">
    {/* Search Input */}
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
        darkMode
          ? "bg-gray-700 border-gray-600 text-gray-100"
          : "bg-gray-100 border-gray-300 text-gray-800"
      }`}
    >
      <Search size={16} className="text-gray-400" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        placeholder="Search dispute..."
        className={`bg-transparent text-sm outline-none w-40 ${
          darkMode ? "placeholder-gray-400" : "placeholder-gray-500"
        }`}
      />
    </div>

    {/* Custom Dropdown */}
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          darkMode
            ? "bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
        }`}
      >
        {selectedStatus === "Disputed" && (
          <AlertCircle size={16} className="text-red-500" />
        )}
        {selectedStatus === "Dispute Resolved" && (
          <CheckCircle size={16} className="text-blue-500" />
        )}
        {selectedStatus}
        {dropdownOpen ? (
          <ChevronUp size={16} className="ml-1" />
        ) : (
          <ChevronDown size={16} className="ml-1" />
        )}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-20 overflow-hidden border ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            }`}
          >
            {["All", "Disputed", "Dispute Resolved"].map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setSelectedStatus(opt);
                  setDropdownOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-all ${
                  selectedStatus === opt
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-800"
                    : darkMode
                    ? "hover:bg-gray-600 text-gray-100"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                {opt === "All" && "🌐 "}
                {opt === "Disputed" && <AlertCircle size={15} />}
                {opt === "Dispute Resolved" && <CheckCircle size={15} />}
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
</div>

{/* Results div */}
<div className="text-sm text-gray-500 mb-4">
{filteredDisputes.length > 0 ? (
  <p className="text-sm text-gray-500 mb-2">
    Showing {start} - {Math.min(end, filteredDisputes.length)} of {filteredDisputes.length}{" "}
    {filteredDisputes.length !== 1 ? "disputes" : "dispute"}
  </p>
) : (
  <p className="text-sm text-gray-500 mb-2">No disputes found</p>
)}
</div>

      {loading && <div className="text-center text-sm text-gray-500 py-4">Loading...</div>}

      {disputes.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-8">No disputes found.</div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={currentPage} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="grid gap-5">
          {paginated.map((o) => {
            const mineBuyer = o.buyer?.toLowerCase() === address?.toLowerCase();
            const mineSeller = o.seller?.toLowerCase() === address?.toLowerCase();
            const isMediator = mediator && mediator.toLowerCase() === address?.toLowerCase();
            const tokenInfo = TOKEN_LOGOS[o.paymentToken] || { logo: "/logos/default.svg", name: "TOKEN" };
            const isResolved = o.status === 9;

            const cardBg = isResolved
              ? (darkMode ? "bg-gray-800 border-green-700 shadow-lg" : "bg-gray-50 border-green-800 shadow-lg")
              : (darkMode ? "bg-red-900/20 border-red-700/30 shadow-lg" : "bg-red-50 border-red-200 shadow-lg");

             let statusLabel = STATUS?.[o.status] ?? "Unknown";
             if (statusLabel === "DisputeResolved" || o.status === 9) {
             statusLabel = "Dispute Resolved";
            }
             else if (statusLabel === "Disputed" || o.status === 5) {
             statusLabel = "Disputed";
            }

            return (
              <motion.div key={`${o.id}-${o.listingId}`} variants={cardVariants} className={`p-5 rounded-xl border ${cardBg}`}>
                {/* header */}
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold flex items-center gap-1">📦 Order #{o.id} • 🏷️ Listing #{o.listingId}</span>
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1`}
    >
      {o.status === 1 && "🟡 "}{o.status === 2 && "🔵 "}{o.status === 3 && "🟣 "}
      {(o.status === 4 || o.status === 9) && "🟢 "}{(o.status === 5 || o.status === 8) && "🔴 "}
      {statusLabel}
    </span>
    {(o.completed && o.status !== 9) && (
      <CircleCheck size={18} className={`${darkMode ? "text-green-400" : "text-green-600"}`} />
    )}

                    {(o.disputeInitiator && o.status === 5 && o.disputeInitiator !== "0x0000000000000000000000000000000000000000") && (
                      <span className="flex items-center gap-1 text-red-500 text-xs">
                        <AlertTriangle size={14} /> Dispute by {o.disputeInitiator.slice(0, 6)}...{o.disputeInitiator.slice(-4)}
                      </span>
                    )}
                  </div>

                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{displayDate(o.createdAt)}</span>
                </div>

                {/* product info */}
                <div className="flex items-center gap-3 mb-4">
                  <img src={o.uri} alt={o.title} className="w-16 h-16 rounded-lg object-cover border" />
                  <div>
                    <h3 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{o.title || "Untitled Product"}</h3>
                  </div>
                </div>

                {/* details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
                    <p className="flex items-center gap-1"><Package size={14} /> <span className="font-medium">Quantity:</span> {o.quantity}</p>
                    <p className="flex items-center gap-1"><Timer size={14} /> <span className="font-medium">Estimated Delivery:</span> 
                    {o.etaDays ? `${o.etaDays} ${o.etaDays === 1 ? "day" : "days"}` : <span className="italic text-gray-400">{o.status === 1 ? (mineBuyer ? "To be set by seller" : "Please set delivery time") : ""}</span>}
                    </p>
                    <p className="flex items-center gap-1"><MapPin size={14} /> <span className="font-medium">{mineBuyer ? "Your" : "Buyer's"} Location:</span> {o.buyerLocation}</p>
                    {o.buyerComment && (<p className="flex items-center gap-1"><MessageSquareText size={14} /> <span className="font-medium">{mineBuyer ? "Your" : "Buyer's"} Comment:</span> {o.buyerComment}</p>)}
                    {o.rated && (<p className="flex items-center gap-1">{o.rated === true ? <ThumbsUp size={18} className="text-green-500" /> : <ThumbsDown size={18} className="text-red-500" />} <span className="font-medium">{mineBuyer ? "How you rated seller:" : isMediator ? "How buyer rated seller:" : "How buyer rated you:"}</span> {o.rated === true ? "Good" : "Bad"}</p>)}
                  </div>

                  <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
                    <p className="flex items-center gap-1"><User size={14} /> <span className="font-medium text-blue-600">Buyer:</span> <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>{o.buyer.slice(0,6)}...{o.buyer.slice(-4)}</span></p>
                    <p className="flex items-center gap-1"><User size={14} /> <span className="font-medium text-purple-600">Seller:</span> <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}`}>{o.seller.slice(0,6)}...{o.seller.slice(-4)}</span></p>
                    <p className="flex items-center gap-1"><Store size={14} /> <span className="font-medium">Store ID:</span> <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-800"}`}>🏬 {String(o.storeId ?? 0).padStart(3,"0")}</span></p>
                  </div>
                </div>
 
                {/* price & actions */}
                <div>
                  <div className="flex justify-end items-center gap-2 mt-4">
                    <img src={tokenInfo.logo} alt={tokenInfo.name} className="w-6 h-6" />
                    <div className={`text-right ${darkMode ? "text-gray-100" : "text-gray-700"}`}>
                      <div className="font-semibold">{Intl.NumberFormat().format(o.amount)} {tokenInfo.name}</div>
                      <div className="text-xs text-gray-500">Shipping: {Intl.NumberFormat().format(o.shippingFee) ?? 0} {tokenInfo.name}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap mt-4 gap-2">
                    <button onClick={() => { setSelectedOrder(o); setChatWith(mineBuyer ? o.seller : o.buyer); setChatOpen(true); }} className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><MessageSquare size={16} /> Chat</button>

                    {/* mediator resolve */}
                    { (isMediator && !isResolved) && (
                      <button onClick={() => { handleResolve(o, tokenInfo.name) }} className="px-3 py-1 rounded-md text-sm bg-yellow-600 text-white hover:bg-yellow-700 flex items-center gap-2">Resolve Dispute</button>
                    )}

                    {/* buyer/seller/mediator cancel */}
                    { (isMediator && !isResolved) && (
                      <button onClick={() => { handleCancelDispute(o) }} className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">Cancel Dispute</button>
                    )}

                    {/* View Receipt Button (only if NFT exists) */}
                    { (isMediator && isResolved && o.receiptURI) && (
                    <button
                    onClick={() => {
                    openReceiptModal(o)
                    }}
                    className="px-3 py-1 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                     >
                    🧾 View Receipt
                    </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2 flex-wrap">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-4 py-2 rounded-lg border transition-colors ${darkMode ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50"}`}>Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-2 rounded-lg border font-medium transition ${page === currentPage ? "bg-blue-500 border-blue-500 text-white" : darkMode ? "border-gray-700 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-200"}`}>{page}</button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-lg border transition-colors ${darkMode ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50"}`}>Next</button>
        </div>
      )}

  {/* Confirm Modal */}
  <ConfirmModal
    isOpen={confirmOpen}
    onClose={() => setConfirmOpen(false)}
    title={confirmConfig.title}
    message={confirmConfig.message}
    onConfirm={() => {
      setConfirmOpen(false);
      try {
        confirmConfig.onConfirm();
      } catch (e) {
        console.log(e);
      }
    }}
  />

  {/* Input Modal */}
  <InputModal
    isOpen={inputOpen}
    onClose={() => setInputOpen(false)}
    title={inputConfig.title}
    fields={inputConfig.fields}
    onSubmit={(values) => {
      setInputOpen(false);
      try {
        inputConfig.onSubmit(values);
      } catch (e) {
        console.log(e);
      }
    }}
  />

      {/* Chat Modal */}
      <ChatModal open={chatOpen} onClose={() => { setChatOpen(false); setChatWith(null); }} userWallet={address} chatWith={chatWith} orderId={selectedOrder?.id} userRole={ (address === selectedOrder?.buyer) ? "buyer" : (address === selectedOrder?.seller) ? "seller" : (mediator && mediator.toLowerCase() === address?.toLowerCase() ? "mediator" : "viewer") } darkMode={darkMode} />

    {/* receipt modal */}
    <ViewReceiptModal
      isOpen={showReceiptModal}
      onClose={() => closeReceiptModal()}
      order={selectedOrder}
    />
    </div>
  );
}