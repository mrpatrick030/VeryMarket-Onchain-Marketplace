"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImageIcon, Send, FileIcon, Upload, MessageSquare } from "lucide-react";
import axios from "axios";

export default function ChatModal({
  open,
  onClose,
  userWallet,
  chatWith,
  orderId,
  userRole,
  darkMode,
}) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mediatorJoined, setMediatorJoined] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch or create session
  const fetchSession = async () => {
    if (!orderId || !userWallet || !chatWith) return;
    try {
      const res = await axios.get(`/api/chats/sessions?orderId=${orderId}`);
      let chatSession = res.data;
      if (!chatSession) {
        const createRes = await axios.post(`/api/chats/sessions`, {
          order_id: orderId,
          buyer_wallet: userRole === "buyer" ? userWallet : chatWith,
          seller_wallet: userRole === "seller" ? userWallet : chatWith,
        });
        chatSession = createRes.data;
      }
      setSession(chatSession);
      setMediatorJoined(chatSession?.mediator_joined || false);
    } catch (err) {
      console.log("Error fetching session:", err);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!session?.id) return;
    try {
      const res = await axios.get(`/api/chats/messages?sessionId=${session.id}`);
      setMessages(res.data || []);
    } catch (err) {
      console.log("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    if (open) fetchSession();
  }, [open]);

  useEffect(() => {
    if (session?.id) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [session?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Upload to IPFS
  const uploadFile = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/uploadFiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          setUploadProgress(percent);
        },
      });
      if (response.status === 200) {
        return response.data.cid;
      }
    } catch (error) {
      console.log("Error uploading file:", error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
    return null;
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() && !file) return;
    if (!session?.id) return;
    setLoading(true);

    try {
      let attachmentUrl = null;
      if (file) {
        const cid = await uploadFile(file);
        if (cid) {
          attachmentUrl = `${cid}`;
        }
      }

      await axios.post(`/api/chats/messages`, {
        session_id: session.id,
        sender_wallet: userWallet,
        receiver_wallet: chatWith,
        message: newMessage.trim(),
        attachment_url: attachmentUrl,
      });

      setNewMessage("");
      setFile(null);
      setPreviewUrl(null);
      fetchMessages();
    } catch (err) {
      console.log("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file select and preview
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  // Drag and drop handlers 
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setPreviewUrl(URL.createObjectURL(dropped));
    }
  };

  // Mediator joins
  const handleMediatorJoin = async () => {
    if (!session?.id) return;
    try {
      await axios.patch(`/api/chats/mediator`, {
        session_id: session.id,
        mediator_wallet: userWallet,
      });
      setMediatorJoined(true);
    } catch (err) {
      console.log("Error joining as mediator:", err);
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
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-xl shadow-xl border ${
              darkMode
                ? "bg-gray-900 text-gray-100 border-gray-700"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            {/* Header */}
            <div
              className={`flex justify-between items-center px-4 py-3 border-b ${
                darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare size={16} /> Chat (Order #{orderId})
              </div>

              {userRole === "mediator" && !mediatorJoined && (
                <button
                  onClick={handleMediatorJoin}
                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 transition"
                >
                  Join Chat
                </button>
              )}

              <button
                onClick={onClose}
                className={`p-2 rounded-full transition ${
                  darkMode
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-200 text-gray-700"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mediator notice */}
            {mediatorJoined && (
              <div
                className={`text-center py-2 text-sm font-medium border-b ${
                  darkMode
                    ? "bg-gray-900 text-yellow-100 border-blue-700"
                    : "bg-blue-100 text-gray-700 border-blue-300"
                }`}
              >
                🟢 Mediator has joined the chat
              </div>
            )}

            {/* Messages area with drag-and-drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 p-4 overflow-y-auto space-y-3 relative transition-colors duration-200 ${
                isDragging
                  ? "border-2 border-green-500 bg-green-50/20 dark:bg-green-900/30"
                  : darkMode
                  ? "bg-gray-800"
                  : "bg-gray-50"
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm font-semibold rounded-lg">
                  <Upload className="mr-2" /> Drop file to upload
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    mediator={session?.mediator_wallet}
                    key={m.id}
                    msg={m}
                    userWallet={userWallet}
                    darkMode={darkMode}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input and preview */}
            <div
              className={`p-3 border-t flex flex-col gap-2 ${
                darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}
            >
              {previewUrl && (
                <div className="relative">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                        darkMode
                          ? "border-gray-700 bg-gray-800 text-gray-300"
                          : "border-gray-200 bg-gray-100 text-gray-700"
                      }`}
                    >
                      <FileIcon size={16} />
                      <span className="text-xs truncate">{file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs"
                  >
                    <X size={12} />
                  </button>
                  {uploading && (
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className="h-2 bg-green-600 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 items-center">
                <label className="cursor-pointer text-gray-500 hover:text-green-600">
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-gray-200"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />

                <button
                  onClick={handleSend}
                  disabled={loading || uploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50 flex items-center gap-1"
                >
                  {uploading ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <>
                      <Send size={16} /> Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Message Bubble
function MessageBubble({ msg, userWallet, mediator, darkMode }) {
  const isMe = msg.sender_wallet?.toLowerCase() === userWallet?.toLowerCase() && msg.sender_wallet?.toLowerCase() !== mediator?.toLowerCase()
  const isMediator = msg.sender_wallet?.toLowerCase() === mediator?.toLowerCase()
  const bubbleStyle = isMe
    ? "bg-blue-600 text-white rounded-br-none self-end"
    : isMediator
    ? "bg-green-700 text-white rounded-bl-none self-start"
    : darkMode
    ? "bg-gray-700 text-gray-100 rounded-bl-none self-start"
    : "bg-gray-200 text-gray-900 rounded-bl-none self-start";

  // Wallet substring
  const walletSubstring = msg.sender_wallet
    ? `${msg.sender_wallet.slice(0, 6)}...${msg.sender_wallet.slice(-4)}`
    : "Unknown";

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      <div className={`max-w-[75%] p-2 rounded-2xl shadow ${bubbleStyle}`}>
        {/* Wallet Tag */}
        <div className="text-[10px] opacity-70 mb-1">
          {isMe ? "You" : isMediator ? "Mediator" : walletSubstring}
        </div>

        {/* Attachment preview or link */}
        {msg.attachment_url && (
          msg.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <img
              src={msg.attachment_url}
              alt="attachment"
              className="rounded-lg mb-1 max-w-[200px]"
            />
          ) : (
            <a
              href={msg.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
            >
              📎 View file
            </a>
          )
        )}

        {/* Text message */}
        <p className="text-sm">{msg.message}</p>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] opacity-70 mt-1">
        {new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}