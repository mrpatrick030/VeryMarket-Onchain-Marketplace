"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ViewReceiptModal({ isOpen, onClose, order }) {
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (!order?.receiptURI) return;

    const fetchMetadata = async () => {
      try {
        const res = await fetch(order.receiptURI);
        const response = await fetch(`/api/viewNFTmetadataHFS?fileId=${order.receiptURI}`);
        const data = await response.json();
        setMetadata(data.metadata);
      } catch (err) {
        console.log("Failed to fetch NFT metadata:", err);
        setMetadata(null);
      }
    };

    fetchMetadata();
  }, [order?.receiptURI]);

  if (!order) return null;

  const { receiptTokenId, createdAt } = order;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString()
    : "-";

  const imgSrc = metadata?.image || "/images/default-receipt.png";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-50"
          leave="ease-in duration-200"
          leaveFrom="opacity-50"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black dark:bg-black/50" />
        </Transition.Child>

        {/* Modal panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md bg-white/10 dark:bg-gray-900/30 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden text-gray-900 dark:text-gray-100">
              
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-white/20 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold">Receipt #{receiptTokenId}</Dialog.Title>
                <button onClick={onClose} className="p-1 hover:bg-white/10 dark:hover:bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* NFT Image with 3D hover */}
              <div className="p-4 flex justify-center perspective">
                <div className="w-64 h-64 rounded-xl shadow-lg transform transition-transform duration-500 hover:rotate-y-12 hover:rotate-x-6 hover:scale-105">
                  <img
                    src={imgSrc}
                    alt={`Receipt NFT ${receiptTokenId}`}
                    className="w-full h-full object-cover rounded-xl border border-white/20 dark:border-gray-700"
                  />
                </div>
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="px-6 pb-6 space-y-2 text-sm">
                  {metadata.attributes?.map((attr, i) => (
                    <p key={i}>
                      <span className="font-medium">{attr.trait_type}:</span> {attr.value}
                    </p>
                  ))}
                  <p>
                    <span className="font-medium">Order created:</span> {formattedDate}
                  </p>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}