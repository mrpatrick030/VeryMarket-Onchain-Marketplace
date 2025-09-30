"use client";
import { useEffect, useState, useMemo } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import ConfirmModal from "./ConfirmModal";
import InputModal from "./InputModal";
import ChatModal from "./ChatModal"; // still available for later
import { Search, Grid, List, LayoutGrid, Menu, X, MessageCircle, MessageSquare, UserCircle, Folder } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrdersTab({ pushToast, TOKEN_LOGOS = {}, STATUS = [], darkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();

  const [contract, setContract] = useState(null);
  const [mediator, setMediator] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(start, start + ITEMS_PER_PAGE);
  }, [orders, currentPage]);

  // Modals state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => {} });

  const [inputOpen, setInputOpen] = useState(false);
  const [inputConfig, setInputConfig] = useState({ title: "", fields: [], onSubmit: () => {} });

  // chat (left for wiring later)
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
          console.debug("mediator not readable:", err?.message || err);
        }
      } catch (err) {
        console.log("contract init err", err);
      }
    })();
  }, [walletProvider]);

  // Load orders for current user
  const loadOrders = async () => {
    if (!contract || !address) return;
    setLoading(true);
    try {
      const raw = await contract.getOrdersForUser(address);
      // raw is Order[]; map to friendly JS objects
      const normalized = raw.map((o, idx) => ({
        id: Number(o.id),
        buyer: o.buyer,
        seller: o.seller,
        listingId: Number(o.listingId),
        paymentToken: o.paymentToken,
        amountRaw: o.amount,
        amount: Number(formatUnits(o.amount, 18)), // assume 18 decimals
        quantity: Number(o.quantity),
        shippingFeeRaw: o.shippingFee,
        shippingFee: Number(formatUnits(o.shippingFee, 18)),
        etaDays: Number(o.estimatedDeliveryDays || 0),
        buyerLocation: o.buyerLocation,
        status: Number(o.status),
        fundsEscrowed: o.fundsEscrowed,
        completed: o.completed,
        buyerComment: o.buyerComment,
        rated: o.rated,
        createdAt: Number(o.createdAt) ? Number(o.createdAt) * 1000 : null,
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

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, address]);

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
        { name: "etaDays", label: "Estimated delivery days", type: "number", placeholder: "e.g. 5" },
      ],
      async (values) => {
        const { shippingFee, etaDays } = values;
        if (!shippingFee || !etaDays) return pushToast?.("error", "All fields required");
        try {
          setLoading(true);
          // convert shippingFee to wei (18 decimals assumption)
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

  // Buyer: confirm & pay (handles ETH vs token)
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
          // Native ETH/HBAR
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

  // Buyer: confirm delivery with rating/comment (positive boolean + optional comment)
  const openConfirmDelivery = (orderId) => {
    askInput(
      "Confirm Delivery & Rate Seller",
      [
        { name: "positive", label: "Was delivery good? (yes/no)", type: "text", placeholder: "yes or no" },
        { name: "comment", label: "Comment", type: "text", placeholder: "Optional comment" },
      ],
      async (values) => {
        const positive = String(values.positive).toLowerCase().startsWith("y");
        const comment = values.comment || "";
        try {
          setLoading(true);
          await callTx("confirmDelivery", orderId, positive, comment);
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
      staggerChildren: 0.1, // 👈 delay between each card
    },
  },
};

// Variants for each card
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};

  // If not connected
  if (!walletProvider) {
    return <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>Please connect your wallet to view orders.</div>;
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Orders</h2>
          <div className="text-sm text-gray-500">Showing {orders.length} orders</div>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading...</div>}

        {orders.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">You have no orders.</div>
        )}


{/* Orders Grid */}
<AnimatePresence mode="wait">
  <motion.div
    key={currentPage}
    variants={containerVariants}
    initial="hidden"
    animate="show"
    exit={{ opacity: 0, y: -20 }}
    className="grid gap-4"
  >
    {paginated.map((o) => {
      const mineBuyer = o.buyer?.toLowerCase() === address?.toLowerCase();
      const mineSeller = o.seller?.toLowerCase() === address?.toLowerCase();
      const isMediator = mediator && mediator.toLowerCase() === address?.toLowerCase();
      const tokenInfo = TOKEN_LOGOS[o.paymentToken] || { logo: "/logos/default.svg", name: "TOKEN" };
      const statusLabel = STATUS?.[o.status] ?? String(o.status);

      return (
        <motion.div
          key={`${o.id}-${o.listingId}`}
          variants={cardVariants}
          className={`p-4 rounded-lg shadow ${darkMode ? "bg-gray-800" : "bg-white"}`}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium truncate">
                  Order #{o.id} • {statusLabel}
                </div>
                <div className="text-xs text-gray-400 ml-2">{formatDate(o.createdAt)}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Listing {o.listingId} • Qty {o.quantity} • Buyer:{" "}
                <span className="font-mono">
                  {o.buyer.slice(0, 6)}...{o.buyer.slice(-4)}
                </span>{" "}
                • Seller:{" "}
                <span className="font-mono">
                  {o.seller.slice(0, 6)}...{o.seller.slice(-4)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                • Estimated Delivery Time: {(o.etaDays === 1) ? (o.etaDays + " day") : (o.etaDays + " days")}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <img src={tokenInfo.logo} alt={tokenInfo.name} className="w-6 h-6" />
              <div className="text-right">
                <div className="font-semibold">
                  {o.amount} {tokenInfo.name}
                </div>
                <div className="text-xs text-gray-400">
                  Shipping: {o.shippingFee ?? 0} {tokenInfo.name}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {mineSeller && o.status === 1 && (
              <button onClick={() => openSellerSetShipping(o.id)} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                Set Shipping
              </button>
            )}

            {mineSeller && o.status === 3 && (
              <button onClick={() => markShipped(o.id)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                Mark Shipped
              </button>
            )}

            {mineBuyer && o.status === 2 && (
              <button onClick={() => openBuyerConfirmAndPay(o)} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                Confirm & Pay
              </button>
            )}

            {mineBuyer && o.status === 4 && (
              <button onClick={() => openConfirmDelivery(o.id)} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                Confirm Delivery
              </button>
            )}

            {mineBuyer && o.status === 1 && (
              <button onClick={() => buyerCancelBeforeEscrow(o.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                Cancel Order
              </button>
            )}

            {mineBuyer && o.status === 3 && (
              <button onClick={() => buyerCancelAndRefund(o.id)} className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">
                Request Refund
              </button>
            )}

            {(mineSeller && (o.status === 1 || o.status === 2)) && (
              <button onClick={() => sellerCancelOrder(o.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                Cancel Order
              </button>
            )}

            {(mineBuyer || mineSeller) && (o.status === 3 || o.status === 4) && (
              <button onClick={() => openDispute(o.id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                Open Dispute
              </button>
            )}

            <button
              onClick={() => {
                const chatTarget = mineBuyer ? o.seller : o.buyer;
                setChatWith(chatTarget);
                setChatOpen(true);
              }}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <MessageSquare size={16} /> Chat
            </button>
          </div>
        </motion.div>
      );
    })}
  </motion.div>
</AnimatePresence>


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



      </div>

      {/* ConfirmModal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          setConfirmOpen(false);
          try { confirmConfig.onConfirm(); } catch(e) { console.log(e); }
        }}
      />

      {/* InputModal */}
      <InputModal
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title={inputConfig.title}
        fields={inputConfig.fields}
        onSubmit={(values) => {
          setInputOpen(false);
          try { inputConfig.onSubmit(values); } catch(e) { console.log(e); }
        }}
      />

      {/* Chat modal (kept here, we can wire server-side chat later) */}
      <ChatModal
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatWith(null); }}
        userWallet={address}
        chatWith={chatWith}
      />
    </div>
  );
}
