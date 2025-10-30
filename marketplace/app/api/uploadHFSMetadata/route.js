import { NextResponse } from "next/server";
import {
  Client,
  FileCreateTransaction,
  Hbar,
  PrivateKey,
} from "@hashgraph/sdk";

export async function POST(request) {
  try {
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
  } catch (err) {
    console.error("❌ HFS upload error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}