"use client";
import { useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import axios from "axios";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function CreateListingTab({ walletProvider, pushToast, TOKEN_LOGOS, darkMode }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [token, setToken] = useState(Object.keys(TOKEN_LOGOS)[0] || "0x0000000000000000000000000000000000000000");
  const [uri, setUri] = useState(""); 
  const [quantity, setQuantity] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [open, setOpen] = useState(false);

  // File Upload State
  const [thePhoto, setThePhoto] = useState("");
  const [thePhotoHash, setThePhotoHash] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const uploadPhoto = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", thePhoto);

      const response = await axios.post("/api/uploadFiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        setThePhotoHash(response.data.cid);
        setUri(response.data.cid);
        pushToast("✅ File uploaded to IPFS");
      }
    } catch (error) {
      console.log("Error uploading to IPFS:", error.message);
      pushToast("❌ Failed to upload image", "error");
    } finally {
      setLoading(false);
    }
  };

  async function createListing() {
    if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");
    if (!quantity || quantity <= 0) return pushToast("⚠️ Quantity must be at least 1", "warning");
    if (!price || Number(price) <= 0) return pushToast("⚠️ Enter a valid price", "warning");
    if (!uri) return pushToast("⚠️ Upload product photo", "warning");
    if (!title) return pushToast("⚠️ Enter product title", "warning");

    try {
      setLoading2(true);
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
      setThePhoto("");
      setThePhotoHash("");
      setSelectedFileName("");
    } catch (error) {
      console.log(error.message);
      pushToast("❌ Failed to create listing", "error");
    } finally {
      setLoading2(false);
    }
  }

  const bg = darkMode ? "bg-gray-800" : "bg-white";
  const inputBg = darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-900";
  const label = darkMode ? "text-gray-300" : "text-gray-700";

  return (
    <div className={`p-6 ${bg} rounded-xl shadow-lg flex flex-col gap-4 md:max-w-lg`}>
      <h2 className="text-xl font-bold text-blue-500">📦 Create New Listing</h2>

      {/* Title */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Product Title</label>
        <input 
          className={`w-full p-2 border rounded ${inputBg}`} 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="e.g. Brand new sports wear"
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

      {/* File Upload */}
      <div>
        <form>
          <label className={`block text-sm font-medium mb-1 ${label}`}>Upload Product Image</label>

          <label htmlFor="openPhotoFolder" className="cursor-pointer">
            <div
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setThePhoto(file);
                  setSelectedFileName(file.name);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition 
                ${thePhoto ? "border-blue-500 bg-blue-50" : "border-gray-400 hover:border-blue-400"} 
                ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
            >
              {thePhoto ? (
                <p className="text-blue-600 font-medium">{selectedFileName}</p>
              ) : (
                <>
                  <p className="text-gray-500">Drag & drop your file here</p>
                  <p className="text-sm text-gray-400">or click below to browse</p>
                </>
              )}
            </div>
          </label>

          <input
            type="file"
            id="openPhotoFolder"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setThePhoto(file);
                setSelectedFileName(file.name);
              }
            }}
          />

          {thePhoto && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={thePhotoHash || URL.createObjectURL(thePhoto)}
                alt="Preview"
                className="h-24 w-24 rounded object-cover border"
              />

              {/* Upload Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  uploadPhoto();
                }}
                className={`rounded-md px-4 py-2 text-white transition ${
                  loading
                    ? "bg-yellow-600 cursor-wait"
                    : thePhotoHash
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-green-600 cursor-pointer hover:bg-green-700"
                }`}
                disabled={loading || thePhotoHash}
              >
                {loading
                  ? "⏳ Uploading..."
                  : thePhotoHash
                  ? "✅ Uploaded"
                  : "☁️ Upload"}
              </button>

              {/* Remove Button */}
              <button
                onClick={() => {
                  setThePhoto("");
                  setThePhotoHash("");
                  setSelectedFileName("");
                }}
                className="rounded-md bg-red-600 hover:bg-red-700 cursor-pointer text-white px-3 py-2"
              >
                ✖ Remove
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Token Selector */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${label}`}>Payment Token</label>
            <div className="relative">
      {/* Selected Token */}
      <div
        className={`flex items-center justify-between p-2 border rounded cursor-pointer ${inputBg}`}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <img src={TOKEN_LOGOS[token].logo} alt="" className="w-5 h-5" />
          {TOKEN_LOGOS[token].name}
          {token === "0x0000000000000000000000000000000000000000" && " (Native ETH)"}
        </span>
        <span className="text-gray-400">▼</span>
      </div>

      {/* Dropdown List */}
      {open && (
        <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded z-10 max-h-60 overflow-y-auto border">
          {Object.entries(TOKEN_LOGOS).map(([addr, info]) => (
            <div
              key={addr}
              onClick={() => {
                setToken(addr);
                setOpen(false);
              }}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <img src={info.logo} alt="" className="w-5 h-5" />
              {info.name}{" "}
              {addr === "0x0000000000000000000000000000000000000000" && "(Native ETH)"}
            </div>
          ))}
        </div>
      )}
    </div>
      </div>

      {/* Submit */}
      <button 
        onClick={createListing} 
        disabled={loading2} 
        className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading2 ? "⏳ Creating..." : "🚀 Create Listing"}
      </button>
    </div>
  );
}
