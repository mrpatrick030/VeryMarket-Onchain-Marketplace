"use client";
import { useState, useEffect } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import axios from "axios";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function MarketplaceTab({ walletProvider, pushToast, TOKEN_LOGOS, darkMode }) {
  const [loading, setLoading] = useState(false); // global loading
  const [loading2, setLoading2] = useState(false); // action loading
  const [store, setStore] = useState(null);
  const [showEditStore, setShowEditStore] = useState(false);
  const [openTokenDropdown, setOpenTokenDropdown] = useState(false);

  // Store form
  const [storeName, setStoreName] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeImage, setStoreImage] = useState(null);
  const [storeImageHash, setStoreImageHash] = useState("");
  const [storeFileName, setStoreFileName] = useState("");
  const [draggingStoreFile, setDraggingStoreFile] = useState(false);
  const [storeImageUploading, setStoreImageUploading] = useState(false);

  // Listing form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [token, setToken] = useState(Object.keys(TOKEN_LOGOS)[0] || "0x0000000000000000000000000000000000000000");
  const [listingImage, setListingImage] = useState(null);
  const [listingImageHash, setListingImageHash] = useState("");
  const [listingFileName, setListingFileName] = useState("");
  const [draggingListingFile, setDraggingListingFile] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [listingImageUploading, setListingImageUploading] = useState(false);

  const bg = darkMode ? "bg-gray-800" : "bg-white";
  const inputBg = darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-900";

  // Fetch store
  useEffect(() => {
    if (!walletProvider) return;
    const fetchStore = async () => {
      try {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        const userStore = await contract.getMyStore();
        if (userStore.exists) {
          setStore(userStore);
          setStoreName(userStore.name);
          setStoreDesc(userStore.description);
          setStoreLocation(userStore.location);
          setStorePhone(userStore.phoneNumber);
          setStoreImageHash(userStore.image);
        }
      } catch (error) {
        setStore(null);
      }
    };
    fetchStore();
  }, [walletProvider]);

  // Upload file to IPFS with per-image loading
  const uploadFile = async (file, setHash, setUploading) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/uploadFiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200) {
        setHash(response.data.cid);
        pushToast("✅ File uploaded to IPFS");
      }
    } catch (error) {
      console.log("Error uploading to IPFS:", error.message);
      pushToast("❌ Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  // Save store
  const saveStore = async () => {
    if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");
    if (!storeName || !storeDesc || !storeLocation || !storePhone || !storeImageHash)
      return pushToast("⚠️ Fill all store fields and upload image", "warning");

    try {
      setLoading2(true);
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      if (store) {
        const tx = await contract.updateStore(store.id, storeName, storeDesc, storeLocation, storePhone, storeImageHash);
        await tx.wait();
        pushToast("✅ Store updated successfully!");
      } else {
        const tx = await contract.createStore(storeName, storeDesc, storeLocation, storePhone, storeImageHash);
        await tx.wait();
        pushToast("✅ Store created successfully!");
      }

      setStore({ name: storeName, description: storeDesc, location: storeLocation, phoneNumber: storePhone, image: storeImageHash });
      setShowEditStore(false);
    } catch (error) {
      console.log(error.message);
      pushToast("❌ Failed to save store", "error");
    } finally {
      setLoading2(false);
    }
  };

  // Create listing
  const createListing = async () => {
    if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");
    if (!quantity || quantity <= 0) return pushToast("⚠️ Quantity must be at least 1", "warning");
    if (!price || Number(price) <= 0) return pushToast("⚠️ Enter a valid price", "warning");
    if (!listingImageHash) return pushToast("⚠️ Upload product photo", "warning");
    if (!title || !category || !description) return pushToast("⚠️ Fill all listing fields", "warning");
    if (!store) return pushToast("⚠️ Create a store first", "warning");

    try {
      setLoading2(true);
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const dateAdded = new Date().toISOString();
      const tx = await contract.createListing(
        token,
        parseUnits(price, 18),
        title,
        listingImageHash,
        quantity,
        store.id,
        category,
        dateAdded,
        description
      );
      await tx.wait();

      pushToast("✅ Listing created successfully!");
      setTitle(""); setPrice(""); setQuantity(1);
      setToken(Object.keys(TOKEN_LOGOS)[0]);
      setListingImage(null); setListingImageHash(""); setListingFileName("");
      setCategory(""); setDescription("");
    } catch (error) {
      console.log(error.message);
      pushToast("❌ Failed to create listing", "error");
    } finally {
      setLoading2(false);
    }
  };



  // const approveEth = async () => {
  //   if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");

  //   try {
  //     setLoading(true);
  //     const provider = new BrowserProvider(walletProvider);
  //     const signer = await provider.getSigner();
  //     const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

  //     // Zero address for ETH
  //     const tx = await contract.approveToken(
  //       "0x0000000000000000000000000000000000000000",
  //       true
  //     );
  //     await tx.wait();

  //     pushToast("✅ ETH approved successfully!");
  //   } catch (err) {
  //     console.error(err);
  //     pushToast("❌ Failed to approve ETH", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className={`p-6 ${bg} rounded-xl shadow-lg flex flex-col gap-6 md:max-w-2xl`}>
      {/* ---------- STORE ---------- */}
      {(!store || showEditStore) && (
        <div className={`p-4 border rounded-xl ${bg} flex flex-col gap-3`}>
          <h2 className="text-xl font-bold text-blue-500">{store ? "🏪 Edit Store" : "🏪 Create Your Store"}</h2>
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Store Name" value={storeName} onChange={e => setStoreName(e.target.value)} />
          <textarea className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Description" value={storeDesc} onChange={e => setStoreDesc(e.target.value)} />
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Location" value={storeLocation} onChange={e => setStoreLocation(e.target.value)} />
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Phone Number" value={storePhone} onChange={e => setStorePhone(e.target.value)} />

          <div
            onDrop={e => {
              e.preventDefault(); setDraggingStoreFile(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                setStoreImage(file); setStoreFileName(file.name);
                uploadFile(file, setStoreImageHash, setStoreImageUploading);
              }
            }}
            onDragOver={e => { e.preventDefault(); setDraggingStoreFile(true); }}
            onDragLeave={() => setDraggingStoreFile(false)}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all ${draggingStoreFile ? "border-green-500 shadow-lg" : "border-gray-400"} ${inputBg}`}
            onClick={() => document.getElementById("storeFileInput").click()}
          >
           {storeImage ? (
    <div className="relative">
    <img src={URL.createObjectURL(storeImage)} alt="Preview" className="w-32 h-32 object-cover mb-2 rounded" />
    {storeImageUploading && (
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/30 dark:bg-gray-700/30 rounded">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
   </div>
   ) : storeImageHash ? (
   <img src={storeImageHash} alt="Current store image" className="w-32 h-32 object-cover mb-2 rounded" />
   ) : (
  <p className="text-gray-500 py-6">Drag & drop store image here or click to browse</p>
   )}
            <input type="file" id="storeFileInput" className="hidden" onChange={e => {
              const file = e.target.files[0];
              if (file) { setStoreImage(file); setStoreFileName(file.name); uploadFile(file, setStoreImageHash, setStoreImageUploading); }
            }} />
          </div>
          <button onClick={saveStore} disabled={loading2} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded">
            {loading2 ? "⏳ Saving..." : store ? "💾 Update Store" : "Create Store"}
          </button>
        </div>
      )}

{/* ---------- Toggle ---------- */}
{store && (
  <div className="flex justify-end">
    <button
      onClick={() => setShowEditStore(!showEditStore)}
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium cursor-pointer shadow-sm transition-all duration-200 
        ${showEditStore 
          ? "bg-blue-600 hover:bg-blue-700 text-white" 
          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"}`}
    >
      {showEditStore ? "← Back to Listing" : "✎ Edit Store"}
    </button>
  </div>
)}


      {/* ---------- LISTING ---------- */}
      {store && !showEditStore && (
        <div className={`p-4 border rounded-xl ${bg} flex flex-col gap-3`}>
          <h2 className="text-xl font-bold text-blue-500">📦 Create New Listing</h2>
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
          <input type="number" min="1" className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Quantity" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          <input className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
          <textarea className={`w-full p-2 border-2 outline-blue-500 border-gray-400 rounded ${inputBg}`} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

          <div
            onDrop={e => { e.preventDefault(); setDraggingListingFile(false); const file = e.dataTransfer.files[0]; if (file) { setListingImage(file); setListingFileName(file.name); uploadFile(file, setListingImageHash, setListingImageUploading); } }}
            onDragOver={e => { e.preventDefault(); setDraggingListingFile(true); }}
            onDragLeave={() => setDraggingListingFile(false)}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all ${draggingListingFile ? "border-green-500 shadow-lg" : "border-gray-400"} ${inputBg}`}
            onClick={() => document.getElementById("listingFileInput").click()}
          >
           {listingImage ? (
  <div className="relative">
    <img src={URL.createObjectURL(listingImage)} alt="Preview" className="w-32 h-32 object-cover mb-2 rounded" />
    {listingImageUploading && (
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/30 dark:bg-gray-700/30 rounded">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
  </div>
) : listingImageHash ? (
  <img src={listingImageHash} alt="Current listing image" className="w-32 h-32 object-cover mb-2 rounded" />
) : (
  <p className="text-gray-500 py-6">Drag & drop product image here or click to browse</p>
)}
            <input type="file" id="listingFileInput" className="hidden" onChange={e => { const file = e.target.files[0]; if (file) { setListingImage(file); setListingFileName(file.name); uploadFile(file, setListingImageHash, setListingImageUploading); } }} />
          </div>

          {/* Token Selector */}
          <div className="relative">
            <div className={`flex items-center justify-between p-2 border rounded cursor-pointer ${inputBg}`} onClick={() => setOpenTokenDropdown(!openTokenDropdown)}>
              <span className="flex items-center gap-2">
                <img src={TOKEN_LOGOS[token].logo} alt="" className="w-5 h-5" />
                {TOKEN_LOGOS[token].name} {token === "0x0000000000000000000000000000000000000000" && "(Native ETH)"}
              </span>
              <span className="text-gray-400">▼</span>
            </div>
            {openTokenDropdown && (
              <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded z-10 max-h-60 overflow-y-auto border">
                {Object.entries(TOKEN_LOGOS).map(([addr, info]) => (
                  <div key={addr} onClick={() => { setToken(addr); setOpenTokenDropdown(false); }} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <img src={info.logo} alt="" className="w-5 h-5" /> {info.name} {addr === "0x0000000000000000000000000000000000000000" && "(Native ETH)"}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={createListing} disabled={loading2} className="mt-3 px-4 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded">
            {loading2 ? "⏳ Creating..." : "🚀 Create Listing"}
          </button>
        </div>
      )}







    {/* <button
      onClick={approveEth}
      disabled={ loading}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "Approving..." : "Approve ETH"}
    </button> */}

    </div>
  );
}