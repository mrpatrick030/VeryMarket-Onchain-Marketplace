"use client";
import { useState, useEffect, useMemo } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";
import { motion, AnimatePresence } from "framer-motion";

// Reuse same modal structure but inline here
function InlineModal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 text-gray-900 dark:text-gray-100"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DisputesTab({ pushToast, darkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { address } = useWeb3ModalAccount();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundToBuyer, setRefundToBuyer] = useState("");
  const [payoutToSeller, setPayoutToSeller] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const getContract = async () => {
    if (!walletProvider) throw new Error("Wallet not connected");
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    return new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
  };

  const fetchDisputes = async () => {
    try {
      const contract = await getContract();
      const openDisputes = await contract.getAllOpenDisputes();
      setDisputes(openDisputes);
    } catch (err) {
      console.error("Failed to fetch disputes:", err);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [walletProvider]);

  const handleResolve = async () => {
    if (!refundToBuyer || !payoutToSeller) {
      return pushToast("Error", "Both fields are required", "error");
    }

    try {
      setLoading(true);
      const contract = await getContract();
      const refundWei = parseUnits(refundToBuyer.toString(), 18);
      const payoutWei = parseUnits(payoutToSeller.toString(), 18);

      const tx = await contract.resolveDispute(selectedOrder.id, refundWei, payoutWei);
      await tx.wait();

      pushToast("Success", "Dispute resolved successfully", "success");
      setResolveOpen(false);
      setRefundToBuyer("");
      setPayoutToSeller("");
      fetchDisputes();
    } catch (err) {
      console.error("Resolve dispute failed:", err);
      pushToast("Error", "Failed to resolve dispute", "error");
    } finally {
      setLoading(false);
    }
  };

  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return disputes.slice(start, start + itemsPerPage);
  }, [disputes, currentPage]);

  const totalPages = Math.ceil(disputes.length / itemsPerPage);

  if (!walletProvider) {
    return (
      <div
        className={`p-6 rounded-lg ${
          darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"
        }`}
      >
        Please connect your wallet to view and resolve disputes.
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}>
      <h1 className="text-xl font-bold mb-4">Disputes</h1>

      {disputes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center">No disputes found.</p>
      ) : (
        <>
          <AnimatePresence>
            {paginatedDisputes.map((order, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow mb-3"
              >
                <p>
                  <span className="font-semibold">Order ID:</span> {order.id.toString()}
                </p>
                <p>
                  <span className="font-semibold">Buyer:</span> {order.buyer}
                </p>
                <p>
                  <span className="font-semibold">Seller:</span> {order.seller}
                </p>
                <p>
                  <span className="font-semibold">Amount:</span> {formatUnits(order.amount, 18)} TOKEN
                </p>
                <p>
                  <span className="font-semibold">Shipping Fee:</span>{" "}
                  {formatUnits(order.shippingFee, 18)} TOKEN
                </p>

                <button
                  className="mt-3 px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => {
                    setSelectedOrder(order);
                    setResolveOpen(true);
                  }}
                >
                  Resolve Dispute
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-3 mt-6">
            <button
              className="flex items-center gap-1 px-3 py-2 border rounded disabled:opacity-50 dark:border-gray-600"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="flex items-center gap-1 px-3 py-2 border rounded disabled:opacity-50 dark:border-gray-600"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      <InlineModal open={resolveOpen} onClose={() => setResolveOpen(false)}>
        <h2 className="text-lg font-semibold mb-4">
          Resolve Dispute - Order #{selectedOrder?.id?.toString()}
        </h2>

        <label className="block text-sm mb-2">Refund to Buyer</label>
        <input
          type="number"
          step="0.0001"
          placeholder="e.g. 0.5"
          value={refundToBuyer}
          onChange={(e) => setRefundToBuyer(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />

        <label className="block text-sm mb-2">Payout to Seller</label>
        <input
          type="number"
          step="0.0001"
          placeholder="e.g. 1.0"
          value={payoutToSeller}
          onChange={(e) => setPayoutToSeller(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />

        <button
          onClick={handleResolve}
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          {loading ? "Processing..." : "Submit Resolution"}
        </button>
      </InlineModal>
    </div>
  );
}
