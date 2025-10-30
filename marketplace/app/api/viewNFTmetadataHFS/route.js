import { NextResponse } from "next/server";
import { Client, PrivateKey, FileContentsQuery } from "@hashgraph/sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) return NextResponse.json({ success: false, error: "Missing fileId" }, { status: 400 });

    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Fetch the private file contents
    const contents = await new FileContentsQuery()
      .setFileId(fileId)
      .execute(client);

    // Convert to string and parse JSON
    const metadataStr = Buffer.from(contents).toString("utf-8");
    const metadata = JSON.parse(metadataStr);

    return NextResponse.json({ success: true, metadata });
  } catch (err) {
    console.error("Error fetching private HFS file:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}