import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

// GET messages
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userWallet = searchParams.get("userWallet");
  const chatWith = searchParams.get("chatWith");

  if (!userWallet || !chatWith) {
    return NextResponse.json({ error: "Missing wallet addresses", data: [] }, { status: 400 });
  }

  try {
    const messages = await sql`
      SELECT * FROM verymarketchats
      WHERE (sender_wallet = ${userWallet} AND receiver_wallet = ${chatWith})
         OR (sender_wallet = ${chatWith} AND receiver_wallet = ${userWallet})
      ORDER BY created_at ASC
    `;
    return NextResponse.json(messages.rows || []);
  } catch (err) {
    console.error("DB fetch error:", err);
    return NextResponse.json({ error: "Error fetching messages", data: [] }, { status: 500 });
  }
}

// POST message
export async function POST(req) {
  try {
    const body = await req.json();
    const { sender_wallet, receiver_wallet, message } = body;

    if (!sender_wallet || !receiver_wallet || !message) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO verymarketchats (sender_wallet, receiver_wallet, message)
      VALUES (${sender_wallet}, ${receiver_wallet}, ${message})
      RETURNING *
    `;
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("DB insert error:", err);
    return NextResponse.json({ error: "Error sending message" }, { status: 500 });
  }
}
