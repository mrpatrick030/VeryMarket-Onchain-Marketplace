"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function InputModal({ isOpen, onClose, onSubmit, title, fields }) {
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateField = (name, value, type) => {
    if (!value || value.trim() === "") return `${name} is required`;
    if (type === "number") {
      const num = Number(value);
      if (isNaN(num) || num <= 0) return `${name} must be greater than 0`;
    }
    return "";
  };

  const handleChange = (name, value, type) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    const fieldDef = fields.find((f) => f.name === name);
    const error = validateField(fieldDef.label, value, type);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    let newErrors = {};
    fields.forEach((f) => {
      const val = formValues[f.name];
      const err = validateField(f.label, val, f.type);
      if (err) newErrors[f.name] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateAll()) return;
    onSubmit(formValues);
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
              {title}
            </h2>

            {/* Fields */}
            <div className="mt-4 space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    className={`w-full p-2 rounded-lg border transition-colors
                      ${errors[f.name] ? "border-red-500" : "border-gray-300"}
                      bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200`}
                    value={formValues[f.name] || ""}
                    onChange={(e) => handleChange(f.name, e.target.value, f.type)}
                  />
                  {errors[f.name] && (
                    <p className="text-red-500 text-xs mt-1">{errors[f.name]}</p>
                  )}
                </div>
              ))}
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
                disabled={Object.values(errors).some((e) => e)}
              >
                Submit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
