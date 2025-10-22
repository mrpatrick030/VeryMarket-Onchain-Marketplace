"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Bot,
  ChevronDown,
  ChevronUp,
  LineChart,
  Coins,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalyticsInsights({
  metrics,
  prevMetrics,
  storeCount,
  salesByToken,
  salesByCategory,
  darkMode = false,
}) {
  const [insightType, setInsightType] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState([]);
  const [open, setOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const controllerRef = useRef(null);
  const containerRef = useRef(null);

  const options = [
    { value: "overall", label: "Overall Performance", icon: LineChart },
    { value: "tokens", label: "Token Sales", icon: Coins },
    { value: "categories", label: "Category Trends", icon: ShoppingBag },
  ];

  const convertBigInt = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "bigint") return obj.toString();
    if (Array.isArray(obj)) return obj.map(convertBigInt);
    if (typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, convertBigInt(v)])
      );
    }
    return obj;
  };

  // Generate insights on button click
  const generateInsights = async () => {
    if (!metrics || !salesByToken) return;

    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    setLoading(true);
    setAiResponse([]);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: convertBigInt(metrics),
          prevMetrics: convertBigInt(prevMetrics),
          storeCount,
          salesByToken: convertBigInt(salesByToken),
          salesByCategory: convertBigInt(salesByCategory),
          focus: insightType,
        }),
        signal: controllerRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        buffer += decoder.decode(value || new Uint8Array());

        const lines = buffer.split("\n").filter(Boolean);
        if (lines.length) setAiResponse(lines);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setAiResponse(["❌ Failed to fetch insights."]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeOption = options.find((opt) => opt.value === insightType);

  // Auto-scroll container when new AI response lines show up
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [aiResponse]);

  return (
    <div
      className={`rounded-2xl p-6 transition-colors duration-300 shadow-md ${
        darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Bot className="text-emerald-500" size={20} />
          <h3 className="text-lg font-semibold">AI Insights</h3>
        </div>

        <div className="flex items-center gap-3">
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
              {activeOption && (
                <>
                  <activeOption.icon size={16} className="text-emerald-500" />
                  {activeOption.label}
                </>
              )}
              {dropdownOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute right-0 mt-2 w-52 rounded-xl shadow-lg z-20 overflow-hidden border ${
                    darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                  }`}
                >
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setInsightType(opt.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-all ${
                        insightType === opt.value
                          ? darkMode
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-100 text-emerald-800"
                          : darkMode
                          ? "hover:bg-gray-600 text-gray-100"
                          : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      <opt.icon size={15} />
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Generate Insights Button */}
      <div className="mb-3">
        <button
          onClick={generateInsights}
          disabled={loading}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            darkMode
              ? "bg-emerald-600/80 text-white hover:bg-emerald-500 disabled:opacity-50"
              : "bg-emerald-500 text-white hover:bg-emerald-200 disabled:opacity-50"
          }`}
        >
          {loading ? "Generating..." : "Generate Insights"}
        </button>
      </div>

      {/* Collapsible Insights */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-emerald-500" size={16} />
                  <span>Generating AI Insights...</span>
                </>
              ) : (
                <>
                  <Sparkles className="text-emerald-500" size={16} />
                  <span>Click "Generate Insights" to update analysis</span>
                </>
              )}
            </div>

            <div ref={containerRef} className="mt-2 min-h-[100px] max-h-80 overflow-y-auto">
              <AnimatePresence mode="wait">
                {aiResponse.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-2 rounded-lg border mb-1 ${
                      darkMode ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">{line}</pre>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}