import { NextResponse } from "next/server";
import {
  Client,
  FileCreateTransaction,
  FileAppendTransaction,
  FileContentsQuery,
  PrivateKey,
} from "@hashgraph/sdk";

export async function POST(request) {
  try {
    const metadata = await request.json();

    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
    const client = Client.forTestnet().setOperator(
      process.env.HEDERA_ACCOUNT_ID,
      operatorKey
    );

    // Step 1: Create an empty file (public access)
    const createTx = new FileCreateTransaction()
      .setKeys([]) // public file
      .setContents("")
      .setMaxTransactionFee(2_000_000); // small fee in tinybars

    const createSubmit = await createTx.execute(client);
    const createReceipt = await createSubmit.getReceipt(client);
    const fileId = createReceipt.fileId.toString();

    console.log("✅ File created:", fileId);

    // Step 2: Append metadata
    const metadataBuffer = Buffer.from(JSON.stringify(metadata), "utf-8");
    const appendTx = new FileAppendTransaction()
      .setFileId(fileId)
      .setContents(metadataBuffer)
      .setMaxTransactionFee(2_000_000);

    await appendTx.execute(client);
    console.log("📎 Metadata appended.");

    // Step 3: Verify contents directly from Hedera (not mirror)
    console.log("⏳ Verifying file contents...");
    const query = new FileContentsQuery().setFileId(fileId);
    const contents = await query.execute(client);

    if (!contents || contents.length === 0) {
      return console.log("File contents not retrievable — append may have failed.");
    }

    console.log("✅ Verification successful — file readable on-chain.");

    // Step 4: Return token URI (mirror URL)
    const tokenURI = `https://testnet.mirrornode.hedera.com/api/v1/files/${fileId}/contents`;
    console.log("This is the tokenURI", tokenURI)

    return NextResponse.json({ success: true, fileId, tokenURI });
  } catch (err) {
    console.log("❌ HFS upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}