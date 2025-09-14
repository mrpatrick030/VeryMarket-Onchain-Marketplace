import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Modal } from "@/lib/web3modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = { title: "Very Market", description: "Decentralized Marketplace" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50"><Web3Modal>{children}</Web3Modal></body>
    </html>
  );
}

