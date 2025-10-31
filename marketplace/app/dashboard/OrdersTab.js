"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import ConfirmModal from "./ConfirmModal";
import InputModal from "./InputModal";
import ChatModal from "./ChatModal";
import { Search, Grid, List, LayoutGrid, Menu, X, MessageCircle, MessageSquare, UserCircle, Folder, CircleCheck, Package, Timer, MapPin, MessageSquareText, ThumbsUp, ThumbsDown, User, Store, AlertTriangle, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Shield, SortAsc, SortDesc, } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ViewReceiptModal from "./ViewReceiptModal";

export default function OrdersTab({ pushToast, TOKEN_LOGOS = {}, STATUS = [], darkMode }) {
  const { address, caipAddress, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
 
  const [contract, setContract] = useState(null);
  const [mediator, setMediator] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  //orders filter and search useStates
const [statusFilter, setStatusFilter] = useState("all");
const [searchTerm, setSearchTerm] = useState("");

const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef(null);

  const statusOptions = useMemo(() => {
    // produce { value: "all" | "0" | "1"... , label }
    const opts = [{ value: "all", label: "All statuses" }];
    STATUS.forEach((s, idx) => {
      if (idx === 0) return;
      opts.push({ value: String(idx), label: s });
    });
    return opts;
  }, [STATUS]);



  // Modals state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => {} });

  const [inputOpen, setInputOpen] = useState(false);
  const [inputConfig, setInputConfig] = useState({ title: "", fields: [], onSubmit: () => {} });

  // chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWith, setChatWith] = useState(null);

  // Initialize contract with signer
  useEffect(() => {
    if (!walletProvider) return;
    (async () => {
      try {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const c = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        setContract(c);
        // mediator (read-only)
        try {
          const med = await c.mediator();
          setMediator(med);
        } catch (err) {
          // ignore if not present
          console.log("mediator not readable:", err?.message || err);
        }
      } catch (err) {
        console.log("contract init err", err);
      }
    })();
  }, [walletProvider]);

 
  // Load orders for current user
  const [refresh, setRefresh] = useState(false)
  const loadOrders = async () => {
    if (!contract || !address) return;
     if (refresh === false) {
          setLoading(true)
        }
    try {
      const raw = await contract.getOrdersForUser(address);
      // raw is Order[]; mapping to friendly JS objects
      const normalized = raw.map((o, idx) => ({
        id: Number(o.id),
        buyer: o.buyer, 
        seller: o.seller,
        listingId: Number(o.listingId),
        storeId: Number(o.storeId),
        paymentToken: o.paymentToken,
        amountRaw: o.amount,
        amount: Number(formatUnits(o.amount, 18)), // assume 18 decimals
        quantity: Number(o.quantity),
        shippingFeeRaw: o.shippingFee,
        shippingFee: Number(formatUnits(o.shippingFee, 18)),
        etaDays: Number(o.estimatedDeliveryDays || 0),
        buyerLocation: o.buyerLocation,
        status: Number(o.status),
        uri:o.uri,
        title:o.title,
        disputeInitiator: o.disputeInitiator,
        previousStatusBeforeDispute: o.previousStatus,
        fundsEscrowed: o.fundsEscrowed,
        completed: o.completed,
        buyerComment: o.buyerComment,
        rated: o.rated,
        createdAt: Number(o.createdAt) ? Number(o.createdAt) * 1000 : null,
        receiptTokenId: o.receiptTokenId, 
        receiptURI: o.receiptURI,
      })).sort((a, b) => b.createdAt - a.createdAt);
      setOrders(normalized);
      setCurrentPage(1);
    } catch (err) {
      console.log("loadOrders err", err);
      pushToast?.("error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // load all orders
  useEffect(() => {
    if (!contract) return;
    loadOrders();
    setRefresh(true)
      // update every 90s
    const interval = setInterval(() => {
      loadOrders();
    }, 120000)
    return () => clearInterval(interval);
  }, [contract, address]);

  // Dropdown outside click close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Filtered orders: apply status filter first, then sort (we keep current sort as descending by date)
  const filteredOrders = useMemo(() => {
    let arr = [...orders];
    if (statusFilter !== "all") {
      const wantedStatus = Number(statusFilter); // statusFilter stores index
      arr = arr.filter((o) => o.status === wantedStatus);
    }
      // Search filter
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    arr = arr.filter(
      (o) =>
        o.id.toString().includes(term) ||
        o.title?.toLowerCase().includes(term) ||
        o.buyerLocation?.toLowerCase().includes(term) ||
        o.buyer?.toLowerCase().includes(term) ||
        o.seller?.toLowerCase().includes(term)
    );
  }
    // default sort: most recent first (already sorted in loadOrders)
    return arr;
  }, [orders, statusFilter, searchTerm]);


    // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
    // Pagination to be applied to filteredOrders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  // ensuring currentPage in range
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Helpers for confirm/input modals
  const askConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmOpen(true);
  };

  const askInput = (title, fields, onSubmit) => {
    setInputConfig({ title, fields, onSubmit });
    setInputOpen(true);
  };

  // Contract actions (wrapped with toasts & reload)
  const callTx = async (fn, ...args) => {
    if (!contract) return pushToast?.("error", "Connect wallet");
    try {
      const tx = await contract[fn](...args);
      await tx.wait();
      pushToast?.("success", `${fn} successful ✅`);
      await loadOrders();
    } catch (err) {
      console.log(fn, err);
      pushToast?.("error", `Error: ${err?.message || fn}`);
    }
  };

  // Seller: set shipping (asks shippingFee and etaDays)
  const openSellerSetShipping = (orderId) => {
    askInput(
      "Set Shipping",
      [
        { name: "shippingFee", label: "Shipping Fee (token units)", type: "text", placeholder: "e.g. 0.01" },
        { name: "etaDays", label: "Estimated Time of Delivery (days)", type: "number", placeholder: "e.g. 5" },
      ],
      async (values) => {
        const { shippingFee, etaDays } = values;
        if (!shippingFee || !etaDays) return pushToast?.("error", "All fields required");
        try {
          setLoading(true);
          // convert shippingFee to wei (18 decimals used)
          const feeWei = parseUnits(shippingFee.toString(), 18);
          await callTx("sellerSetShipping", orderId, feeWei, Number(etaDays));
        }
        catch (err) {
          console.log("Set shipping", err)
        }
        finally {
          setLoading(false);
        }
      }
    );
  };

  // Buyer: confirm & pay (handles HBAR vs token)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];


const openBuyerConfirmAndPay = (order) => {
  const total = (Number(order.amount) + Number(order.shippingFee || 0)).toString();

  askConfirm(
    "Confirm & Pay",
    `Pay total ${total} ${TOKEN_LOGOS[order.paymentToken?.toLowerCase()]?.name || ""}?`,
    async () => {
      if (!contract) return pushToast?.("error", "Connect wallet");
      try {
        setLoading(true);
        const totalWei = parseUnits(total.toString(), 18);
        
        if (!order.paymentToken || order.paymentToken === "0x0000000000000000000000000000000000000000") {
          // Native HBAR
          const tx = await contract.buyerConfirmAndPay(order.id, { value: totalWei });
          await tx.wait();
          pushToast?.("success", "Paid and confirmed ✅");
        } else {
          // ERC20 token flow
          const provider = new BrowserProvider(walletProvider);
          const signer = await provider.getSigner();
          const erc20 = new Contract(order.paymentToken, ERC20_ABI, signer);
      
            const txApprove = await erc20.approve(MARKETPLACE_ADDRESS, totalWei);
            await txApprove.wait();
            pushToast?.("success", "Token approved ✅");
     
          // Now pay
          const tx = await contract.buyerConfirmAndPay(order.id);
          await tx.wait();
          pushToast?.("success", "Paid and confirmed (token) ✅");
        }

        await loadOrders();
      } catch (err) {
        console.log("buyerConfirmAndPay err", err);
        pushToast?.("error", "Payment failed");
      } finally {
        setLoading(false);
      }
    }
  );
};


  // Seller: mark shipped
  const markShipped = (orderId) => {
    askConfirm("Mark Shipped", "Mark this order as shipped?", async () => {
      await callTx("markShipped", orderId);
    });
  };

// Buyer: confirm delivery with rating/comment + NFT metadata upload
const openConfirmDelivery = (orderId, orderData, tokenName) => {
  askInput(
    "Confirm Delivery & Rate Seller",
    [
      { name: "positive", label: "Was delivery good? (yes/no)", type: "text", placeholder: "yes or no" },
      { name: "comment", label: "Comment", type: "text", placeholder: "Optional comment" },
    ],
    async (values) => {
      const positive = String(values.positive).toLowerCase().startsWith("y");
      const comment = values.comment || "";
      setLoading(true);

      try {
        // Step 1: Upload metadata to API
        const metadata = {
          name: `Order #${orderId} Receipt`,
          description: `Receipt NFT for order #${orderId} on VeryMarket`,
          image: orderData?.uri || "/default-receipt.png",
          attributes: [
            { trait_type: "Buyer", value: orderData?.buyer },
            { trait_type: "Seller", value: orderData?.seller },
            { trait_type: "Title", value: orderData?.title },
            { trait_type: "Store Id", value: (Intl.NumberFormat().format(orderData?.storeId).toString()).padStart(3, "0") },
            { trait_type: "Token", value: tokenName },
            { trait_type: "Amount", value: orderData?.amount },
            { trait_type: "Shipping fee", value: orderData?.shippingFee },
            { trait_type: "Delivered", value: new Date().toLocaleString() },
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
        await callTx("confirmDelivery", orderId, positive, comment, fileId);
      } catch (err) {
        console.log("Confirm delivery error:", err);
        pushToast?.("error", err.message || "Failed to confirm delivery");
      } finally {
        setLoading(false);
      }
    }
  );
};

  // Buyer: cancel before escrow
  const buyerCancelBeforeEscrow = (orderId) => {
    askConfirm(
      "Cancel Order",
      "Cancel this order before escrow? Quantity will be returned to listing.",
      async () => {
        await callTx("buyerCancelBeforeEscrow", orderId);
      }
    );
  };

  // Buyer: cancel and refund (after escrow)
  const buyerCancelAndRefund = (orderId) => {
    askConfirm(
      "Cancel & Refund",
      "Request refund (this will attempt to refund you if escrowed). Proceed?",
      async () => {
        await callTx("buyerCancelAndRefund", orderId);
      }
    );
  };

    // Buyer: cancel and refund (after escrow)
  const sellerCancelOrder = (orderId) => {
    askConfirm(
      "Cancel Order",
      "Cancel this order before escrow. Proceed?",
      async () => {
        await callTx("sellerCancelOrder", orderId);
      }
    );
  };

  // Open dispute
  const openDispute = (orderId) => {
    askConfirm(
      "Open Dispute",
      "Open dispute for this order? Only buyer or seller can open a dispute.",
      async () => {
        await callTx("openDispute", orderId);
      }
    );
  };

  // Cancel dispute
  const cancelDispute = (orderId) => {
    askConfirm(
      "Cancel Dispute",
      "Cancel this dispute only if there is a mutual agreement to cancel. Only the initiator of a dispute is allowed to cancel it.",
      async () => {
        await callTx("cancelDispute", orderId);
      }
    );
  };

  // UI helpers
  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  };


// Variants for container (stagger children)
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // delay between each card
    },
  },
};

// Variants for each card
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};

//useState for orders
const [selectedOrder, setSelectedOrder] = useState(null);

//determine user role
const userRole =
  address === selectedOrder?.buyer
    ? "buyer"
    : address === selectedOrder?.seller
    ? "seller"
    : "mediator";

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


  // UI dropdown active option label
  const activeStatusOption = statusOptions.find((s) => s.value === statusFilter) || statusOptions[0];

  // If not connected
  if (!address) {
    return <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>Please connect your wallet to view orders.</div>;
  }

  return (
   <div className="space-y-6">
  {/* Header */}
  <div
    className={`p-5 rounded-xl shadow-md ${
      darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"
    }`}
  >
    <div className="flex flex-col flex-row justify-between gap-3 mb-2">
    <div>
      <h2 className="text-xl font-bold mb-2">📦 My Orders</h2>
    </div>

          {/* Dropdown filter and search area */}
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
                    placeholder="Search orders..."
                    className={`bg-transparent text-sm outline-none w-40 ${
                      darkMode ? "placeholder-gray-400" : "placeholder-gray-500"
                    }`}
                  />
                </div>
                {/* Dropdown filter area */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((s) => !s);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  darkMode
                    ? "bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">{activeStatusOption.label}</span>
                {dropdownOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-52 rounded-xl shadow-lg z-20 overflow-hidden border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                    }`}
                  >
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                           setStatusFilter(opt.value);
                          setDropdownOpen(false);
                          setCurrentPage(1); // reset page when changing filter
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-all ${
                          statusFilter === opt.value
                            ? darkMode
                              ? "bg-blue-600 text-white"
                              : "bg-blue-100 text-sky-800"
                            : darkMode
                            ? "hover:bg-gray-600 text-gray-100"
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
    </div>

   {/* filtered results */}
   <div className="text-sm text-gray-500 mb-4">
    {filteredOrders.length > 0 ?
    (<p>
    Showing {(( (currentPage-1)*ITEMS_PER_PAGE + 1))} - { Math.min(currentPage*ITEMS_PER_PAGE, filteredOrders.length) } of {filteredOrders.length} {filteredOrders.length > 1 ? "orders" : "order"}
    </p>) :
     (<p className="text-sm text-gray-500">No orders found</p>)}
    </div>

    {loading && (
      <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
    )}

    {(orders.length === 0 && !loading) && (
      <div className="text-center py-10 text-gray-400 text-sm">
        You have no orders.
      </div>
    )}

    {/* Orders Grid */}
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: -20 }}
        className="grid gap-5"
      >
        {paginated.map((o) => {
          const mineBuyer = o.buyer?.toLowerCase() === address?.toLowerCase();
          const mineSeller = o.seller?.toLowerCase() === address?.toLowerCase();
          const isMediator =
            mediator && mediator.toLowerCase() === address?.toLowerCase();
          const tokenInfo =
            TOKEN_LOGOS[o.paymentToken] || {
              logo: "/images/coin.png",
              name: "TOKEN",
            };
          const statusLabel = STATUS?.[o.status] ?? String(o.status);

          return (
<motion.div
  key={`${o.id}-${o.listingId}`}
  variants={cardVariants}
  className={`p-5 rounded-xl shadow-md border ${
    darkMode
      ? "bg-gray-800 border-gray-700"
      : "bg-white border-gray-200"
  }`}
>


{/* Header */}
<div className="flex justify-between items-center border-b pb-2 mb-3">
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm font-semibold flex items-center gap-1">
      📦 Order #{o.id} • 🏷️ Listing #{o.listingId}
    </span>
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
        <AlertTriangle size={14} /> Dispute by {o.disputeInitiator.slice(0, 6)}...
        {o.disputeInitiator.slice(-4)}
      </span>
    )}
  </div>
  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
    {formatDate(o.createdAt)}
  </span>
</div>

{/* Product info (new) */}
<div className="flex items-center gap-3 mb-4">
  <img
    src={o.uri}
    alt={o.title}
    className="w-16 h-16 rounded-lg object-cover border"
  />
  <div>
    <h3 className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
      {o.title || "Untitled Product"}
    </h3>
  </div>
</div>

{/* Details */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
  {/* Left column */}
  <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
    <p className="flex items-center gap-1">
      <Package size={14} /> <span className="font-medium">Quantity:</span> {o.quantity}
    </p>
    <p className="flex items-center gap-1">
      <Timer size={14} /> <span className="font-medium">Estimated Delivery:</span>{" "}
      {o.etaDays ? (
        <span>{o.etaDays} {o.etaDays === 1 ? "day" : "days"}</span>
      ) : (
        <span className="italic text-gray-400">
          {o.status === 1
            ? o.buyer.toLowerCase() === address.toLowerCase()
              ? "To be set by seller"
              : "Please set delivery time"
            : ""}
           {o.status === 8
            ? "Not available"
            : ""}
        </span>
      )}
    </p>
    <p className="flex items-center gap-1">
      <MapPin size={14} />{" "}
      <span className="font-medium">
        {o.buyer.toLowerCase() === address.toLowerCase() ? "Your" : "Buyer's"} Location:
      </span>{" "}
      {o.buyerLocation}
    </p>
    {o.buyerComment && (
      <p className="flex items-center gap-1">
        <MessageSquareText size={14} />{" "}
        <span className="font-medium">
          {o.buyer.toLowerCase() === address.toLowerCase() ? "Your" : "Buyer's"} Comment:
        </span>{" "}
        {o.buyerComment}
      </p>
    )}
    {o.rated && (
      <p className="flex items-center gap-1">
        {o.rated === true ? (
          <ThumbsUp size={18} className="text-green-500" />
        ) : (
          <ThumbsDown size={18} className="text-red-500" />
        )}
        <span className="font-medium">
          {o.buyer.toLowerCase() === address.toLowerCase()
            ? "How you rated seller:"
            : "How buyer rated you:"}
        </span>{" "}
        {o.rated === true ? "Good" : "Bad"}
      </p>
    )}
  </div>

  {/* Right column */}
  <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
    <p className="flex items-center gap-1">
      <User size={14} /> <span className="font-medium text-blue-600">Buyer:</span>{" "}
      <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
        {o.buyer.slice(0, 6)}...{o.buyer.slice(-4)}
      </span>
    </p>
    <p className="flex items-center gap-1">
      <User size={14} /> <span className="font-medium text-purple-600">Seller:</span>{" "}
      <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"}`}>
        {o.seller.slice(0, 6)}...{o.seller.slice(-4)}
      </span>
    </p>
    <p className="flex items-center gap-1">
      <Store size={14} /> <span className="font-medium">Store ID:</span>{" "}
      <span className={`px-2 py-0.5 rounded font-mono ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-800"}`}>
        🏬 {o.storeId?.toString().padStart(3, "0")}
      </span>
    </p>
  </div>
</div>



              {/* Price */}
              <div className="flex justify-end items-center gap-2 mt-4">
                <img
                  src={tokenInfo.logo}
                  alt={tokenInfo.name}
                  className="w-6 h-6"
                />
                <div className="text-right">
                  <div className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-700"}`}>
                    {Intl.NumberFormat().format(o.amount)} {tokenInfo.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Shipping: {Intl.NumberFormat().format(o.shippingFee) ?? 0} {tokenInfo.name}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {mineSeller && o.status === 1 && (
                  <button
                    onClick={() => openSellerSetShipping(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Set Shipping
                  </button>
                )}

                {mineSeller && o.status === 3 && (
                  <button
                    onClick={() => markShipped(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Mark Shipped
                  </button>
                )}

                {mineBuyer && o.status === 2 && (
                  <button
                    onClick={() => openBuyerConfirmAndPay(o)}
                    className="px-3 py-1 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Confirm & Pay
                  </button>
                )}

                {mineBuyer && o.status === 4 && (
                  <button
                    onClick={() => openConfirmDelivery(o.id, o, tokenInfo.name)}
                    className="px-3 py-1 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Confirm Delivery
                  </button>
                )}

                {(mineBuyer && (o.status === 1 || o.status === 2)) && (
                  <button
                    onClick={() => buyerCancelBeforeEscrow(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    Cancel Order
                  </button>
                )}

                {mineBuyer && o.status === 3 && (
                  <button
                    onClick={() => buyerCancelAndRefund(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Request Refund
                  </button>
                )}

                {(mineSeller && (o.status === 1 || o.status === 2)) && (
                  <button
                    onClick={() => sellerCancelOrder(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    Cancel Order
                  </button>
                )}

                {(mineBuyer || mineSeller) && (o.status === 3 || o.status === 4) && (
                  <button
                    onClick={() => openDispute(o.id)}
                    className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    Open Dispute
                  </button>
                )}

                {(mineBuyer || mineSeller) &&
                  o.status === 5 &&
                  o.disputeInitiator.toLowerCase() === address.toLowerCase() && (
                    <button
                      onClick={() => cancelDispute(o.id)}
                      className="px-3 py-1 rounded-md text-sm bg-gray-500 text-white hover:bg-gray-600"
                    >
                      Cancel Dispute
                    </button>
                  )}

                <button
                  onClick={() => {
                    const chatTarget = mineBuyer ? o.seller : o.buyer;
                    setChatWith(chatTarget);
                    setSelectedOrder(o);
                    setChatOpen(true);
                  }}
                  className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                >
                  <MessageSquare size={16} /> Chat
                </button>

                <div className="flex items-center gap-2">

            {/* View Receipt Button (only if NFT exists) */}
            {o.receiptURI && (
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

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="mt-10 flex justify-center items-center gap-2 flex-wrap">
        {/* Prev */}
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            darkMode
              ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          Prev
        </button>

        {/* Pages */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
              page === currentPage
                ? "bg-blue-500 border-blue-500 text-white"
                : darkMode
                ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            darkMode
              ? "border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    )}
  </div>

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
<ChatModal
  open={chatOpen}
  onClose={() => {
    setChatOpen(false);
    setChatWith(null);
  }}
  userWallet={address}
  chatWith={chatWith}
  orderId={selectedOrder?.id}
  userRole={userRole}
  darkMode={darkMode}
/>

{/* receipt modal */}
<ViewReceiptModal
  isOpen={showReceiptModal}
  onClose={() => closeReceiptModal()}
  order={selectedOrder}
/>


</div>

  );
}
