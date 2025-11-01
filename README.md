# 🛍️ VeryMarket — On-chain Decentralized Marketplace on Hedera [Web App](https://verymarket.vercel.app) / [Demo Video](https://youtu.be/GEWxXKut_RA) / [Pitch Deck](https://drive.google.com/drive/folders/1tNL6bmLbsEO9mPdOKLrZAnSKI2UAjvea?usp=drive_link)
![File](https://supposed-emerald-snake.myfilebase.com/ipfs/QmcRNLePGiU5rtPfRGr4Zfxit3LCeucLZw4w2AdVCHzvtc)

- [Hedera course certification](https://certs.hashgraphdev.com/62279945-c127-4185-a919-7ca7b348fa18.pdf)

**VeryMarket** is an on-chain decentralized marketplace where **buyers** can purchase listed products and **sellers** can own stores and sell goods securely.  
It integrates **Hedera File Service (HFS)** for NFT metadata, **Hedera Smart Contract Service (HSCS)** for transactions, and **Hedera Token Service (HTS)** for payments with mock **USDC, USDT, and DAI** tokens.

The marketplace also features **AI-powered analytics**, **real-time order tracking**, **live-market data**, and **wallet connectivity** using **AppKit**.

---

## 🧭 Overview

| Feature | Description |
|----------|--------------|
| 🛍️ Marketplace | Buyers purchase token-priced goods from seller stores |
| 🧾 NFT Receipts | Orders and disputes are recorded on Hedera as NFT metadata |
| 💬 Chat System | Session-based chat between buyer, seller, and mediator |
| 💡 AI Insights | Analytics powered by OpenAI GPT-4.1 mini |
| 📊 Live Dashboard and Charts | Token sales, market data, and category insights |
| ⚙️ Hedera Integration | Smart Contract, Token, and Hedera File Services |
| 🎨 UX | Dark/light mode, animations, search, pagination, filters, drag and drop, and responsive layout |

---

## 🧱 Architecture

```
VeryMarket/
├── app/
│   ├── api/
│   │   ├── uploadHFSMetadata/route.js     # HFS metadata storage
│   │   ├── insights/route.js        # GPT-4.1 insights generator
│   ├── dashboard/
│   │   ├── CreateListingTab.js
│   │   ├── ListingsTab.js
│   │   ├── OrdersTab.js
│   │   ├── DisputesTab.js
│   │   └── AnalyticsTab.js
│   │   └── page.js
│   ├── components/
│   │   └── navbar.js              # Navigation bar
│   └── page.js
│   ├── lib/
│   │   └── contract.js              # ABI & marketplace address
│   └── page.js

VeryMarket-Hardhat-Files
├── contracts/
│   ├── VerymarketContract.sol
│   ├── usdcContract.sol
│   ├── usdtContract.sol
│   ├── daiContract.sol
│   └── ReceiptNFT.sol
├── scripts/
│   ├── deploy.js
│   ├── deployUSDC.js
│   ├── deployUSDT.js
│   ├── deployDAI.js
│   └── deployNFT.js
│   └── linkReceiptNFT.js
└── README.md
```

---

## ⚙️ Core Features

- 📁 Metadata stored on Hedera File Service **HFS** and images stored on **Filebase IPFS**
- 🔗 Wallet connection via **AppKit**
- 🧠 AI analytics powered by **GPT-4.1 mini**
- 🪙 Token payments using **USDC, USDT, DAI**
- 🧾 NFT-based receipts and dispute records
- 🧱 Modular frontend with **Next.js + Framer Motion + TailwindCSS**
- 📡 Real-time order tracking and dispute resolution

---

## 📁 Tabs Overview

### 1. 🏪 Create Listings Tab
![Create Listings](https://supposed-emerald-snake.myfilebase.com/ipfs/QmVXXAMYkhKxAMCyKscmpJM3feHKdShQJNrX2zsQhCmpdx)

**Purpose:** Allows sellers to create or update their store and list products on-chain.

#### Key Features
- Store creation and update  
- Product listing upload  
- Category selection and live preview  
- Uploads images to **Filebase IPFS**

#### Metadata Example
```json
{
  "title": "Solar Power Bank",
  "description": "10000mAh dual USB portable charger",
  "price": "15.00",
  "token": "USDC",
  "image": "ipfs://QmXYZ..."
}
```

---

### 2. 🛍️ Listings Tab
![Listings](https://supposed-emerald-snake.myfilebase.com/ipfs/QmPEWmrnwugMetvzfKpp6VHYku7JGNnjC5BuCk1u3rTb7G)

**Purpose:** Displays all available listings from sellers.

#### Core Functions
- Fetch data via `getAllListings()`  
- Supports 🔍 Search, 🏷️ Category filters, 📄 Pagination  
- Integrates with `/listing/[id]` for product details  

**Single Product Modal**  
![Single Product](https://supposed-emerald-snake.myfilebase.com/ipfs/QmZv4PoQSgAfBrvn3QxWojXqSAoBn5faGpZzrhBxdfA9tg)

**Seller Profile**  
![Seller Profile](https://supposed-emerald-snake.myfilebase.com/ipfs/Qme6gmmU9fCs8Xzj4taPUZCVLwcncfqjv1Sz5jqc8zir2g)

---

### 3. 📦 Orders Tab
![Orders](https://supposed-emerald-snake.myfilebase.com/ipfs/QmQFRPsZZpPQFGB1epk2imCcXZxi1PTSKZHmyBRGcAJXxa)

**Purpose:** Manages buyer and seller order actions — escrow payments, shipping, confirmations.

#### Buyer Actions
- Confirm payment  
- Confirm delivery  
- Open dispute  

#### Seller Actions
- Mark as shipped  
- Set shipping fee  
- Cancel order  

**Order Receipt**  
![Order Receipt](https://supposed-emerald-snake.myfilebase.com/ipfs/QmaFXw1yz7GV57JnebjhwtpMvApAYm8VxEyLiShXPeqvWc)

#### Example Functions
```solidity
buyerConfirmAndPay(uint256 orderId);
sellerMarkShipped(uint256 orderId);
confirmDelivery(uint256 orderId);
openDispute(uint256 orderId);
```

---

### 4. ⚖️ Disputes Tab
![Disputes](https://supposed-emerald-snake.myfilebase.com/ipfs/QmYc7enNgfsmzFGiGbEr4MwXEfKSxZZ6Mz4wMeb6Gudnu5)

**Purpose:** Resolves conflicts between buyers and sellers with mediator support.

#### Dispute Lifecycle
1. Buyer or seller opens a dispute  
2. Mediator reviews the case  
3. Resolution stored to HFS  
4. NFT receipt minted for dispute outcome  

**Chat System:**  
![Chat System](https://supposed-emerald-snake.myfilebase.com/ipfs/QmYxvFjUb6r1RZ67fUrA6eaW3cbCvqAPVmaY8gB3t5rVkN)

#### Example Metadata
```json
{
  "name": "Order #12 Dispute Resolution",
  "Buyer": "0.0.1234",
  "Seller": "0.0.5678",
  "Refund To Buyer": "0.5 USDC",
  "Payout To Seller": "1.0 USDC",
  "Status": "Resolved"
}
```

---

### 5. 📊 Analytics Tab
![Analytics](https://supposed-emerald-snake.myfilebase.com/ipfs/QmaqmGxQYZqefEuqcnnUZkDMn7iV7FUuGJXBTNXn2TKsBU)

**Purpose:** Displays live charts and AI-generated insights from marketplace data.

#### Features
- Token sales tracking (USDC, USDT, DAI)  
- Sales by category and order volume  
- AI summaries powered by GPT-4.1 mini  

**Example AI Output**  
![AI Insights](https://supposed-emerald-snake.myfilebase.com/ipfs/QmQ2TUTZsp5UX46cHndpjiXDmikUnsF9286Uzm124gAEzN)

> 💰 Sales grew 22% this week, mostly from verified stores.  
> ⚡ Dispute resolution speed improved by 10%.  
> 🪙 USDC remains the dominant trading token.

---

## 🔗 API Routes

### 🧾 /api/uploadHFSMetadata
Uploads metadata JSON to **Hedera File Service (HFS)**.

```metadata
    const metadata = await request.json();
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Create a new file key
    const fileKey = operatorKey;

    // Step 1: Create and freeze transaction
    const transaction = new FileCreateTransaction()
      .setKeys([fileKey.publicKey])
      .setContents(JSON.stringify(metadata))
      .setMaxTransactionFee(new Hbar(2))
      .freezeWith(client);

    // Step 2: Sign with file key
    const signTx = await transaction.sign(fileKey);

    // Step 3: Execute with operator key
    const submitTx = await signTx.execute(client);

    // Step 4: Get receipt
    const receipt = await submitTx.getReceipt(client);
    const fileId = receipt.fileId.toString();

    const tokenURI = `https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}/contents`;

    console.log("✅ File successfully created:", fileId);
    console.log("🔗 Token URI:", tokenURI);

    return NextResponse.json({ success: true, fileId, tokenURI });
```

**Returns:**
```json
{
  "fileId": "0.0.123456",
  "tokenURI": "https://testnet.mirrornode.hedera.com/api/v1/files/0.0.123456"
}
```

### 🤖 /api/aiInsights
Generates AI-driven marketplace insights using **OpenAI GPT-4.1 mini**.

```api
  // Call OpenAI using gpt-4.1 version
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a data analytics expert summarizing insights for a Hedera network decentralized on-chain marketplace dashboard.",
        },
        { role: "user", content: prompt },
      ],
    });

    const aiText = completion.choices[0].message.content;

    return new Response(JSON.stringify({ insights: aiText }), {
      headers: { "Content-Type": "application/json" },
    });

---

## 🪙 Smart Contracts

| Contract | Purpose |
|-----------|----------|
| Marketplace.sol | Core logic for listings, orders, and disputes |
| usdcContract.sol/usdtContract.sol/daiContract.sol | Deploys mock USDC, USDT, DAI tokens |
| ReceiptNFT.sol | Handles NFT minting for receipts and resolutions |

---

## 🧩 Contract Functions Reference

### 🏪 Store Management
| Function | Description |
|-----------|--------------|
| createStore | Create a new store |
| updateStore | Update an existing store |
| getAllStores | Fetch all stores |
| getStoreByOwner | Fetch a store by its owner address |

### 🛍️ Product Listings
| Function | Description |
|-----------|--------------|
| createListing | Add a new product listing |
| getAllListings | Retrieve all active listings |
| getListing | Get details of a single listing |
| updateListingQuantity | Update listing stock quantity |
| deleteListing | Remove a product listing |

### 📦 Orders
| Function | Description |
|-----------|--------------|
| createOrder | Create an order |
| buyerConfirmAndPay | Buyer confirms and pays |
| sellerMarkShipped | Seller marks item as shipped |
| confirmDelivery | Buyer confirms successful delivery |
| cancelOrder | Cancel an order |
| getAllOrders | Fetch all orders |
| getOrdersByUser | Get orders belonging to a user |

### ⚖️ Disputes
| Function | Description |
|-----------|--------------|
| openDispute | Open a dispute for an order |
| cancelDispute | Cancel an existing dispute |
| resolveDispute | Mediator resolves dispute |
| getAllDisputes | Retrieve all dispute records |

### 🧾 Receipts
| Function | Description |
|-----------|--------------|
| mintReceipt | Mint NFT receipt for completed or disputed order |

---

## 🧠 AI Integration
OpenAI GPT-4.1 mini is used in `/api/insights` to generate marketplace summaries.

---

## 🚀 Setup & Deployment

**Prerequisites**
- Node.js 22+  
- Next.js 15+  
- Hardhat  
- Ethers.js
- Hedera Testnet Account  
- Hashgraph SDK  
- Filebase Account  
- OpenAI API Key  

**Environment Variables**
```env
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e0201003005...
OPENAI_API_KEY=sk-xxxx
FILEBASE_ACCESS_KEY_ID=...
FILEBASE_SECRET_ACCESS_KEY=....
PRIVATE_KEY=...
```

**Run Locally**
```bash
npm install
npm run dev
```

**Deploy**
- Frontend → Vercel  
- Contracts → Hardhat (Hedera Testnet)

---

## 🧩 Tech Stack

| Layer | Tools |
|--------|-------|
| Frontend | Next.js, React, Framer-Motion, Lucide-React, TailwindCSS |
| Blockchain | Hedera File Service, Hedera Smart Contract Service, Hedera Token Service |
| Backend | PostgreSQL for chat sessions |
| AI | OpenAI GPT-4.1 mini |
| Storage | Filebase IPFS |
| Wallet | AppKit |
| Libraries | Ethers.js, @hashgraph/sdk |

---

## 👨‍💻 Author
**Patrick Ominisan**  
Full Stack Web & Blockchain Developer  

---

## Problems with Current Online Marketplaces
- Online marketplaces are centralised - trust issues
- Lack of transparent payment tracking
- Receipts and order records are often not tamper-proof
- Limited insights into sales, trends, and market behaviour
- Payment disputes are hard to resolve
- Sellers don’t fully own their store data or transactions
- Large platform fees - eat into seller profits and increase buyer costs Problem

## VeryMarket's Solutions
- Decentralized on-chain marketplace - buyers and sellers transact directly without a middleman or intermediary (Thanks to the Hedera Smart Contract Service)
- NFT-based receipts and dispute management - Fully transparent and tamper-proof (Thanks to the Hedera File service HFS and Hashgraph sdk)
- Sellers own their store data - complete control over products and listings
- AI-powered analytics - real-time insights on sales, trends, live-market data and token activity.
- Multi-token payments (USDC, USDT, DAI) - seamless and secure transactions with low network fees in HBAR (Thanks to the Hedera Token Service)
- Accessibilty - VeryMarket is accessible from anywhere in the world with just a wallet login
- Polished UX & wallet integration - Intuitive experience and interface for buyers and sellers
- Live order tracking - buyers and sellers get to track their order status in real-time

## 🪙 Contract Addresses (Hedera Testnet)
[Hedera Hashscan](https://hashscan.io/testnet)

**Marketplace Contract**  
✅ [VeryMarket](https://hashscan.io/testnet/contract/0.0.7158940) 🟢  
`0xF410e3a0abC755e86f098241e9E18EdB66eE6CB5`

**NFT Receipt Contract**  
✅ [ReceiptNFT](https://hashscan.io/testnet/contract/0.0.7158953) 🟢  
`0x6F3DC4A0389e3B7ecE795F9B9cEab88545EA13aA`

**Mock Tokens**
- [MockUSDC](https://hashscan.io/testnet/contract/0.0.7158836): `0x0a7e3660A00A28651821C048351aabcdDbf0a1B1`
- [MockUSDT](https://hashscan.io/testnet/contract/0.0.7158882): `0xAB64c8c61A489C0f598A35a253E70875083Ea602`
- [MockDAI](https://hashscan.io/testnet/contract/0.0.7158890): `0x11e07C5C1FD74731e4567cF40FF59eE169F5301c`

--- 

## 🧾 License

**MIT License**  

Copyright (c) 2025 **Patrick Ominisan**  
