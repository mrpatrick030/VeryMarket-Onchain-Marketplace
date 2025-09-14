"use client";
import { useEffect, useState } from "react";
import { useWeb3ModalProvider, useWeb3ModalAccount } from "@web3modal/ethers/react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

export default function DisputesTab({ act, TOKEN_LOGOS, darkMode }) {
  const { walletProvider } = useWeb3ModalProvider();
  const { isConnected, address } = useWeb3ModalAccount();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!isConnected || !address) return;

    async function loadOrders() {
      try {
        const provider = new BrowserProvider(walletProvider);
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

        const count = await contract.orderCount();
        const fetched = [];

        for (let i = 0; i <= count; i++) {
          const o = await contract.orders(i);

          // Filter ONLY disputed ones (status === 3)
          if (Number(o.status) === 3) {
            fetched.push({
              id: i,
              buyer: o.buyer,
              seller: o.seller,
              listingId: Number(o.listingId),
              paymentToken: o.paymentToken,
              amount: o.amount,
              quantity: Number(o.quantity),
              status: Number(o.status),
              createdAt: Number(o.createdAt),
            });
          }
        }

        setOrders(fetched);
      } catch (err) {
        console.error("Error loading orders:", err);
      }
    }

    loadOrders();
  }, [isConnected, address, walletProvider]);

  if (!isConnected) {
    return <div className="text-center text-gray-500">Please connect your wallet to view disputed orders.</div>;
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="text-center text-gray-500">No disputed orders found.</div>
      ) : (
        orders.map(o => {
          const amt = formatUnits(o.amount, 18);
          const qty = o.quantity || 1;
          const token = TOKEN_LOGOS[o.paymentToken?.toLowerCase()] || { logo: "/logos/default.svg", name: "UNKNOWN" };
          const bg = darkMode ? "bg-gray-800" : "bg-white";
          const text = darkMode ? "text-gray-200" : "text-gray-900";
          const subText = darkMode ? "text-gray-400" : "text-gray-600";

          return (
            <div key={o.id} className={`p-4 ${bg} rounded-xl shadow flex flex-col gap-2`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className={`text-sm font-medium ${text}`}>Order #{o.id} (Disputed)</div>
                  <div className={`text-xs ${subText}`}>
                    Buyer: {o.buyer} • Seller: {o.seller} • Qty: {qty}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <img src={token.logo} className="w-6 h-6" />
                  <span className="font-bold">{amt} {token.name}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {[0, 2500, 5000, 7500, 10000].map(p => (
                  <button
                    key={p}
                    onClick={() => act(o.id, "resolveDispute", p)}
                    className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {p / 100}% to Buyer
                  </button>
                ))}
                <button
                  onClick={() => act(o.id, "refundBuyer")}
                  className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                >
                  Refund Buyer
                </button>
                <button
                  onClick={() => act(o.id, "releaseToSeller")}
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Release to Seller
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
