// components/ChatModal.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import axios from "axios";

export default function ChatModal({ open, onClose, userWallet, chatWith }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch messages
  const fetchMessages = async () => {
    if (!userWallet || !chatWith) return;
    try {
      const res = await axios.get(`/api/chats`, {
        params: { userWallet, chatWith },
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching messages", err);
    }
  };

  // Load initial messages + poll every 5s
  useEffect(() => {
    if (open) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [open, userWallet, chatWith]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/chats", {
        sender_wallet: userWallet,
        receiver_wallet: chatWith,
        message: newMessage.trim(),
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Error sending message", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <h3 className="font-semibold text-lg">Chat</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-blue-700/40 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-800">
              {messages.map((m) => {
                  const isMe =
                    m.sender_wallet.toLowerCase() ===
                    userWallet?.toLowerCase();
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[75%] shadow-sm ${
                          isMe
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{m.message}</p>
                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
              <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  Send
                </button>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
