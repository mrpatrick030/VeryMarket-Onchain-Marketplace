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

    const fetchActivity = async () => {
      try {
        const newFeed = [];

        // Listings - last 10 only
        const listingCount = Number(await contract.listingCount());
        const listingStart = Math.max(listingCount - 10, 0);
        for (let i = listingStart; i < listingCount; i++) {
          const listing = await contract.getListing(i);
          newFeed.unshift({
            id: `listing-${i}`,
            type: "ListingCreated",
            description: `🆕 New listing created by store ${(Number(listing.storeId) + 1).toString().padStart(3, "0")}`,
            token: TOKEN_LOGOS[listing.paymentToken] || null,
            highlight: true,
          });
        }

        // Orders - last 10 only
        const orderCount = Number(await contract.orderCount());
        const orderStart = Math.max(orderCount - 10, 0);
        for (let i = orderStart; i < orderCount; i++) {
          const order = await contract.getOrder(i);
          let type, desc;        

          if (Number(order.status) === 1) {
            type = "OrderRequested";
            let desc = `🛒 Order requested for listing #${order.listingId}`;
          }
          else if (Number(order.status) === 7) {
            type = "DeliveryConfirmed";
            desc = `💯 Order #${i} completed successfully`;
          } else if (Number(order.status) === 5) {
            type = "DisputeOpened";
            desc = `⚖️ Dispute opened for order #${i}`;
          } else if (Number(order.status) === 9) {
            type = "DisputeResolved";
            desc = `✅ Dispute resolved for order #${i}`;
          }

          newFeed.unshift({
            id: `order-${i}`,
            type,
            description: desc,
            token: TOKEN_LOGOS[order.paymentToken] || null,
            highlight: true,
          });
        }

        setActivityFeed(newFeed.slice(0, 10)); // only keep latest 10 items
      } catch (err) {
        console.log("Error fetching activity:", err);
      }
    };

    // Initial fetch
    fetchActivity();

    // Poll every 90s
    const interval = setInterval(fetchActivity, 120000);
    return () => clearInterval(interval);
  }, [walletProvider, TOKEN_LOGOS]);

  return (
    <div className="rounded-2xl p-4 shadow-md border max-h-[300px] overflow-y-auto">
      {activityFeed.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No activity yet — VeryMarket events will appear here shortly.
        </p>
      ) : (
        <ul className="space-y-3">
          {activityFeed.map((a) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-3 rounded-xl p-3 ${
                darkMode ? "bg-gray-700/60" : "bg-gray-50"
              } ${a.highlight ? "animate-pulse" : ""}`}
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
              </div>
              {a.token && (
                <img src={a.token.logo} alt={a.token.name} className="w-5 h-5 rounded-full" />
              )}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ActivityFeed;