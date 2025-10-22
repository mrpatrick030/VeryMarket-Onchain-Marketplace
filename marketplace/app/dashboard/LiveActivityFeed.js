import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../lib/contract";

const ActivityFeed = React.memo(({ walletProvider, TOKEN_LOGOS = {}, darkMode }) => {
  const [activityFeed, setActivityFeed] = useState([]);

  function timeAgo(timestamp) {
    const diff = (Date.now() - timestamp) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

useEffect(() => {
  if (!walletProvider) return;

  const provider = new BrowserProvider(walletProvider);
  const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

  const addActivity = (type, data) => {
    setActivityFeed((prev) => [
      {
        type,
        description:
          type === "ListingCreated"
            ? `🆕 New listing created...`
            : type === "OrderRequested"
            ? `🛒 Order requested for listing #${data.listingId}`
            : type === "DeliveryConfirmed"
            ? `💯 Order #${data.id} completed successfully`
            : type === "DisputeOpened"
            ? `⚖️ Dispute opened for order #${data.id}`
            : type === "DisputeResolved"
            ? `✅ Dispute resolved for order #${data.id}`
            : "Marketplace activity detected",
        token: TOKEN_LOGOS[data.paymentToken] || null,
        timeAgo: timeAgo(Date.now()),
      },
      ...prev.slice(0, 9), // show last 10
    ]);
  };

  // Attach listeners
  const onListingCreated = (seller) => addActivity("ListingCreated", { seller:String(seller) });
  const onOrderRequested = (buyer, listingId, paymentToken) =>
    addActivity("OrderRequested", { buyer, listingId, paymentToken });
  const onDeliveryConfirmed = (id, buyer, seller, paymentToken) =>
    addActivity("DeliveryConfirmed", { id, buyer, seller, paymentToken });
  const onDisputeOpened = (id) => addActivity("DisputeOpened", { id });
  const onDisputeResolved = (id) => addActivity("DisputeResolved", { id });

  contract.on("ListingCreated", onListingCreated);
  contract.on("OrderRequested", onOrderRequested);
  contract.on("DeliveryConfirmed", onDeliveryConfirmed);
  contract.on("DisputeOpened", onDisputeOpened);
  contract.on("DisputeResolved", onDisputeResolved);

  // Cleanup function removes only the listeners we added
  return () => {
    contract.off("ListingCreated", onListingCreated);
    contract.off("OrderRequested", onOrderRequested);
    contract.off("DeliveryConfirmed", onDeliveryConfirmed);
    contract.off("DisputeOpened", onDisputeOpened);
    contract.off("DisputeResolved", onDisputeResolved);
  };
}, [walletProvider]);

  return (
    <div className="rounded-2xl p-4 shadow-md border max-h-[300px] overflow-y-auto">
      {activityFeed.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No activity yet — VeryMarket events will appear here in real-time.
        </p>
      ) : (
        <ul className="space-y-3">
          {activityFeed.map((a, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-3 rounded-xl p-3 ${darkMode ? "bg-gray-700/60" : "bg-gray-50"}`}
            >
              <span className="text-xl">
                {a.type === "ListingCreated"
                  ? "📦"
                  : a.type === "OrderRequested"
                  ? "🛒"
                  : a.type === "DeliveryConfirmed"
                  ? "💯"
                  : a.type === "DisputeOpened"
                  ? "⚖️"
                  : a.type === "DisputeResolved"
                  ? "✅"
                  : "🔔"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{a.description}</p>
                <p className="text-xs text-gray-500">{a.timeAgo}</p>
              </div>
              {a.token && <img src={a.token.logo} alt={a.token.name} className="w-5 h-5 rounded-full" />}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ActivityFeed;