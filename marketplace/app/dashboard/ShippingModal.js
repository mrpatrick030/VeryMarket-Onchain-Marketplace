"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ShippingModal({ isOpen, onClose, onConfirm, orderId }) {
  const [shippingFee, setShippingFee] = useState("");
  const [etaDays, setEtaDays] = useState("");
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    let newErrors = {};
    if (!shippingFee || Number(shippingFee) <= 0) {
      newErrors.shippingFee = "Shipping fee must be greater than 0";
    }
    if (!etaDays || Number(etaDays) <= 0) {
      newErrors.etaDays = "ETA must be greater than 0";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onConfirm(orderId, shippingFee, etaDays);
    onClose();
  };

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
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-[90%] max-w-md p-6 relative"
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Set Shipping Details
            </h2>

            {/* Fields */}
            <div className="mt-4 space-y-4">
              {/* Shipping Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shipping Fee
                </label>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="Enter shipping fee"
                  className={`w-full p-2 rounded-lg border transition-colors
                    ${errors.shippingFee ? "border-red-500" : "border-gray-300"}
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200`}
                />
                {errors.shippingFee && (
                  <p className="text-red-500 text-xs mt-1">{errors.shippingFee}</p>
                )}
              </div>

              {/* ETA Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Delivery (days)
                </label>
                <input
                  type="number"
                  value={etaDays}
                  onChange={(e) => setEtaDays(e.target.value)}
                  placeholder="e.g. 5"
                  className={`w-full p-2 rounded-lg border transition-colors
                    ${errors.etaDays ? "border-red-500" : "border-gray-300"}
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200`}
                />
                {errors.etaDays && (
                  <p className="text-red-500 text-xs mt-1">{errors.etaDays}</p>
                )}
              </div>
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
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-green-600 text-white 
                  hover:bg-green-700 disabled:opacity-50 transition-colors"
                disabled={!shippingFee || !etaDays}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
