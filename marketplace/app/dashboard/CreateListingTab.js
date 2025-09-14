"use client";
import { useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function CreateListingTab({ walletProvider, pushToast, TOKEN_LOGOS, darkMode }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [token, setToken] = useState(Object.keys(TOKEN_LOGOS)[0] || "0x0000000000000000000000000000000000000000");
  const [uri, setUri] = useState(""); 
  const [quantity, setQuantity] = useState(1); 
  const [loading, setLoading] = useState(false);

  async function createListing() {
    if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");
    if (!quantity || quantity <= 0) return pushToast("⚠️ Quantity must be at least 1", "warning");
    if (!price || Number(price) <= 0) return pushToast("⚠️ Enter a valid price", "warning");

    try {
      setLoading(true);
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const tx = await contract.createListing(
        token,
        parseUnits(price, 18),
        title,
        uri,
        quantity
      );
      await tx.wait();

      pushToast("✅ Listing created successfully!");
      setTitle(""); 
      setPrice(""); 
      setUri(""); 
      setQuantity(1);
      setToken(Object.keys(TOKEN_LOGOS)[0]);
    } catch (err) {
      console.error(err);
      pushToast(`❌ Failed to create listing: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  const bg = darkMode ? "bg-gray-800" : "bg-white";
  const inputBg = darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-900";
  const label = darkMode ? "text-gray-300" : "text-gray-700";

  return (
    <div className={`p-6 ${bg} rounded-xl shadow-lg flex flex-col gap-4 max-w-lg`}>
      <h2 className="text-xl font-bold text-blue-500">📦 Create New Listing</h2>

      {/* Title */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Product Title</label>
        <input 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="e.g. Premium Coffee Beans"
        />
      </div>

      {/* Price */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Price (per unit)</label>
        <input 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={price} 
          onChange={e => setPrice(e.target.value)} 
          placeholder="0.05"
        />
      </div>

      {/* Quantity */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Available Quantity</label>
        <input 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={quantity} 
          type="number" 
          min="1" 
          onChange={e => setQuantity(Number(e.target.value))} 
          placeholder="5"
        />
      </div>

      {/* Metadata URI */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Metadata URI (IPFS)</label>
        <input 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={uri} 
          onChange={e => setUri(e.target.value)} 
          placeholder="ipfs://..."
        />
      </div>

      {/* Token Selector */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Payment Token</label>
        <select 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={token} 
          onChange={e => setToken(e.target.value)}
        >
          {Object.entries(TOKEN_LOGOS).map(([addr, info]) => (
            <option key={addr} value={addr}>
              {info.name} ({addr === "0x0000000000000000000000000000000000000000" ? "Native ETH" : info.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button 
        onClick={createListing} 
        disabled={loading} 
        className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "⏳ Creating..." : "🚀 Create Listing"}
      </button>
    </div>
  );
}