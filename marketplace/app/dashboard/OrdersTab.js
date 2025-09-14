"use client";
import { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function OrdersTab({ act, TOKEN_LOGOS, STATUS, darkMode }) {
    const { walletProvider, signer } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();
  const [orders, setOrders] = useState([]);

  // Load user orders from contract
  useEffect(() => {
    if (!isConnected || !address) return;

    async function loadOrders() {
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

        // Assuming contract has a `getAllOrders()` or `getOrdersByUser(address)` method
        let allOrders = await contract.getOrdersByUser(address);

        // Normalize orders
        allOrders = allOrders.map((o, i) => ({
          id: i,
          buyer: o.buyer,
          seller: o.seller,
          status: Number(o.status),
          amount: o.amount,
          listingId: o.listingId,
          quantity: o.quantity,
          paymentToken: o.paymentToken,
          verychatThreadHint: o.verychatThreadHint,
        }));

        setOrders(allOrders);
      } catch (err) {
        console.error("Error loading orders:", err);
      }
    }

    loadOrders();
  }, [isConnected, address]);

  if (!isConnected) {
    return <div className="text-center text-gray-500">Please connect your wallet to view your orders.</div>;
  }

  return (
    <div className="space-y-4">
      {orders
        .filter(
          o =>
            o.buyer.toLowerCase() === address?.toLowerCase() ||
            o.seller.toLowerCase() === address?.toLowerCase()
        )
        .map(o => {
          const amt = formatUnits(o.amount, 18);
          const qty = o.quantity || 1;
          const mineBuyer = o.buyer.toLowerCase() === address?.toLowerCase();
          const mineSeller = o.seller.toLowerCase() === address?.toLowerCase();
          const token = TOKEN_LOGOS[o.paymentToken?.toLowerCase()] || {
            logo: "/logos/default.svg",
            name: "UNKNOWN",
          };
          const bg = darkMode ? "bg-gray-800" : "bg-white";
          const text = darkMode ? "text-gray-200" : "text-gray-900";
          const subText = darkMode ? "text-gray-400" : "text-gray-600";

          return (
            <div key={o.id} className={`p-4 ${bg} rounded-xl shadow flex flex-col gap-2`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className={`text-sm font-medium ${text}`}>
                    Order #{o.id} ({STATUS[Number(o.status)]})
                  </div>
                  <div className={`text-xs ${subText}`}>
                    Listing {Number(o.listingId)} • Qty: {qty} • Buyer: {o.buyer} • Seller: {o.seller}
                  </div>
                  {o.verychatThreadHint && (
                    <div className="text-sm text-blue-500">Verychat Thread: {o.verychatThreadHint}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <img src={token.logo} className="w-6 h-6" />
                  <span className="font-bold">
                    {amt} {token.name}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {mineSeller && Number(o.status) === 1 && (
                  <button
                    onClick={() => act(o.id, "markShipped")}
                    className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Mark Shipped
                  </button>
                )}
                {mineBuyer && (Number(o.status) === 1 || Number(o.status) === 2) && (
                  <button
                    onClick={() => act(o.id, "confirmDelivery")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Confirm Delivery
                  </button>
                )}
                {(mineBuyer || mineSeller) && (Number(o.status) === 1 || Number(o.status) === 2) && (
                  <button
                    onClick={() => act(o.id, "openDispute")}
                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Open Dispute
                  </button>
                )}
                {(mineBuyer || mineSeller) && Number(o.status) === 3 && (
                  <button
                    onClick={() => act(o.id, "refundBuyer")}
                    className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Refund
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
