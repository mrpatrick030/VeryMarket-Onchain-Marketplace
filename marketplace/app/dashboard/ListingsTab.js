"use client";
import { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

const ORDER_STATUS = ["None", "Escrowed", "Shipped", "Disputed", "Refunded", "Released"];

export default function ListingsTab({ TOKEN_LOGOS, darkMode }) {
  const [listings, setListings] = useState([]);
  const [expandedListing, setExpandedListing] = useState(null);
  const [ordersByListing, setOrdersByListing] = useState({});
  const [adminAddresses, setAdminAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const { walletProvider, signer } = useWeb3ModalProvider();
  const { address } = useWeb3ModalAccount();

  const [buyQtyMap, setBuyQtyMap] = useState({});
  const [buyHintMap, setBuyHintMap] = useState({});
 
  // fetch admin addresses
  useEffect(() => {
    async function fetchAdmins() {
      if (!walletProvider) return;
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        const ownerAddr = await contract.owner();
        const mediatorAddr = await contract.mediator();
        setAdminAddresses([ownerAddr.toLowerCase(), mediatorAddr.toLowerCase()]);
      } catch (err) {
        console.error("fetchAdmins error:", err);
      }
    }
    fetchAdmins();
  }, [walletProvider]);

  // fetch listings
  useEffect(() => {
    async function fetchListings() {
      if (!walletProvider) return;
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

        const countBN = await contract.listingCount();
        const count = Number(countBN.toString());
        const results = [];

        for (let i = 1; i <= count; i++) {
          const l = await contract.getListing(i);
          if (!l.active) continue;
          results.push({
            id: i,
            title: l.title,
            price: l.price,
            paymentToken: l.paymentToken,
            uri: l.uri,
            seller: l.seller,
            quantity: Number(l.quantity.toString())
          });
        }
        setListings(results);
      } catch (err) {
        console.error("fetchListings error:", err);
      }
    }
    fetchListings();
  }, [walletProvider]);

  const fetchOrdersForListing = async (listingId) => {
    if (!walletProvider) return;
    try {
      const provider = new BrowserProvider(walletProvider);
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

      const countBN = await contract.orderCount();
      const count = Number(countBN.toString());
      const orders = [];

      for (let i = 1; i <= count; i++) {
        const o = await contract.getOrder(i);
        if (Number(o.listingId.toString()) === listingId) {
          orders.push({
            id: i,
            buyer: o.buyer,
            seller: o.seller,
            status: Number(o.status.toString()),
            amount: o.amount
          });
        }
      }
      setOrdersByListing(prev => ({ ...prev, [listingId]: orders }));
      setExpandedListing(listingId);
    } catch (err) {
      console.error("fetchOrdersForListing error:", err);
    }
  };

  const isAdmin = address && adminAddresses.includes(address.toLowerCase());

  const sendTx = async (fn, ...args) => {
    try {
      setLoading(true);
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const tx = await contract[fn](...args);
      await tx.wait();
      alert(`${fn} executed`);
      if (expandedListing) await fetchOrdersForListing(expandedListing);
    } catch (err) {
      console.error("sendTx error:", err);
      alert(err?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (listingId) => {
    try {
      setLoading(true);
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const tx = await contract.cancelListingIfNoSales(listingId);
      await tx.wait();
      alert("Listing canceled");
      setListings(listings.filter(l => l.id !== listingId));
    } catch (err) {
      console.error("cancelListing error:", err);
      alert(err?.message || "Cancel listing failed");
    } finally {
      setLoading(false);
    }
  };

  const buyListing = async (listing) => {
    const qty = Number(buyQtyMap[listing.id] || 1);
    const hint = buyHintMap[listing.id] || "";

    if (qty <= 0) return alert("Quantity must be >= 1");
    if (qty > listing.quantity) return alert(`Max available quantity is ${listing.quantity}`);

    try {
      setLoading(true);
      const provider = new BrowserProvider(walletProvider);
      const signerInstance = await provider.getSigner();
      const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signerInstance);
      const total = BigInt(listing.price.toString()) * BigInt(qty);

      if (listing.paymentToken === "0x0000000000000000000000000000000000000000") {
        const tx = await contract.buy(listing.id, qty, hint, { value: total });
        await tx.wait();
      } else {
        const erc20 = new Contract(
          listing.paymentToken,
          ["function approve(address spender, uint256 amount) external returns (bool)"],
          signerInstance
        );
        const approveTx = await erc20.approve(MARKETPLACE_ADDRESS, total);
        await approveTx.wait();
        const tx = await contract.buy(listing.id, qty, hint);
        await tx.wait();
      }

      alert("Purchase successful");
      setBuyQtyMap(prev => ({ ...prev, [listing.id]: 1 }));
      setBuyHintMap(prev => ({ ...prev, [listing.id]: "" }));
      await fetchOrdersForListing(listing.id);
    } catch (err) {
      console.error("buyListing error:", err);
      alert(err?.message || "Buy failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {listings.map(l => {
        const token = TOKEN_LOGOS[l.paymentToken?.toLowerCase()] || { logo: "/logos/default.svg", name: "UNKNOWN" };
        const bg = darkMode ? "bg-gray-800" : "bg-white";
        const text = darkMode ? "text-gray-100" : "text-gray-900";
        const subtext = darkMode ? "text-gray-400" : "text-gray-600";

        const priceDisplay = (() => {
          try { return formatUnits(l.price, 18); } catch (e) { return l.price.toString(); }
        })();

        return (
          <div
            key={l.id}
            className={`${bg} rounded-xl shadow-lg hover:shadow-2xl transition p-5 flex flex-col`}
          >
            {/* Title */}
            <h3 className={`text-lg font-bold truncate ${text}`}>{l.title || "Untitled"}</h3>
            <p className={`text-xs ${subtext} mt-1`}>Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}</p>
            <p className={`text-xs ${subtext}`}>Qty Available: {l.quantity}</p>
            {l.uri && <p className={`text-xs ${subtext} truncate`}>URI: <img src={l.uri} width="100" /></p>}

            {/* Price */}
            <div className="flex items-center gap-2 mt-3">
              <img src={token.logo} className="w-6 h-6" alt={token.name} />
              <span className="font-semibold text-green-600">{priceDisplay} {token.name}</span>
            </div>

            {/* Actions */}
            <div className="mt-4 space-y-2">
              {/* Buy */}
              {address && address.toLowerCase() !== l.seller.toLowerCase() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={l.quantity}
                      value={buyQtyMap[l.id] ?? 1}
                      onChange={e => setBuyQtyMap(prev => ({ ...prev, [l.id]: Number(e.target.value) }))}
                      className="px-2 py-1 border rounded w-20 text-black"
                    />
                    <input
                      type="text"
                      value={buyHintMap[l.id] ?? ""}
                      onChange={e => setBuyHintMap(prev => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder="Message to seller"
                      className="px-2 py-1 border rounded flex-1 text-black"
                    />
                  </div>
                  <button
                    onClick={() => buyListing(l)}
                    disabled={loading}
                    className="w-full px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                  >
                    {loading ? "Processing..." : "Buy Now"}
                  </button>
                </div>
              )}

              {/* Seller Cancel */}
              {address && address.toLowerCase() === l.seller.toLowerCase() && (
                <button
                  onClick={() => cancelListing(l.id)}
                  disabled={loading}
                  className="w-full px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                >
                  Cancel Listing
                </button>
              )}

              {/* Orders toggle */}
              <button
                onClick={() => fetchOrdersForListing(l.id)}
                className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
              >
                {expandedListing === l.id ? "Hide Orders" : "Show Orders"}
              </button>
            </div>

            {/* Orders */}
            {expandedListing === l.id && ordersByListing[l.id] && (
              <div className="mt-3 space-y-2">
                {ordersByListing[l.id].length === 0 && (
                  <p className={`text-xs ${subtext}`}>No orders yet</p>
                )}
                {ordersByListing[l.id].map(o => (
                  <div key={o.id} className="p-3 rounded border bg-gray-50 dark:bg-gray-700">
                    <p className="text-xs">Order #{o.id} • Buyer: {o.buyer.slice(0, 6)}...{o.buyer.slice(-4)}</p>
                    <p className="text-xs">Status: {ORDER_STATUS[o.status]}</p>
                    <p className="text-xs mb-2">Amount: {formatUnits(o.amount, 18)} {token.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {/* Buyer actions */}
                      {o.buyer.toLowerCase() === address?.toLowerCase() && (
                        <>
                          {(o.status === 1 || o.status === 2) && (
                            <button onClick={() => sendTx("confirmDelivery", o.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Confirm</button>
                          )}
                          {(o.status === 1 || o.status === 2) && (
                            <button onClick={() => sendTx("openDispute", o.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Dispute</button>
                          )}
                          {o.status === 1 && (
                            <button onClick={() => sendTx("cancelOrder", o.id)} className="px-2 py-1 bg-gray-500 text-white rounded text-xs">Cancel</button>
                          )}
                        </>
                      )}

                      {/* Seller actions */}
                      {o.seller.toLowerCase() === address?.toLowerCase() && (
                        <>
                          {o.status === 1 && (
                            <button onClick={() => sendTx("markShipped", o.id)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Mark Shipped</button>
                          )}
                          {(o.status === 1 || o.status === 2) && (
                            <button onClick={() => sendTx("openDispute", o.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Dispute</button>
                          )}
                        </>
                      )}

                      {/* Admin actions */}
                      {isAdmin && o.status === 3 && (
                        <>
                          <button onClick={() => sendTx("refundBuyer", o.id)} className="px-2 py-1 bg-red-700 text-white rounded text-xs">Refund</button>
                          <button onClick={() => sendTx("releaseToSeller", o.id, 0)} className="px-2 py-1 bg-green-700 text-white rounded text-xs">Release</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}