"use client";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BuyerConfirmPayModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  paymentToken,
  total,
  darkMode
}) {
  if (!isOpen) return null;

  const isEth = paymentToken === "0x0000000000000000000000000000000000000000";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`rounded-2xl shadow-xl w-[90%] max-w-md p-6 relative ${
              darkMode ? "bg-gray-900 text-gray-200" : "bg-white text-gray-900"
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Close Button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              onClick={onClose}
            >
              <X size={20} />
            </button>

            {/* Title */}
            <h2 className="text-lg font-semibold mb-4">
              Confirm Payment
            </h2>

            {/* Summary */}
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Order ID:</span> {orderId}
              </p>
              <p>
                <span className="font-medium">Payment Method:</span>{" "}
                {isEth ? "ETH" : "ERC20 Token"}
              </p>
              <p>
                <span className="font-medium">Total:</span>{" "}
                {ethers.formatEther(total)} {isEth ? "ETH" : "Tokens"}
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                Once you confirm, funds will be escrowed until delivery is completed.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 
                  text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 
                  transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm(orderId, paymentToken, total);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white 
                  hover:bg-blue-700 transition-colors"
              >
                Confirm & Pay
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
