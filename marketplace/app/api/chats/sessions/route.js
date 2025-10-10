import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

//Fetch existing chat session for an order
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId)
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  try {
    const session = await sql`
      SELECT * FROM verymarket_chat_sessions
      WHERE order_id = ${orderId}
      LIMIT 1;
    `;
    return NextResponse.json(session.rows[0] || null);
  } catch (err) {
    console.error("Error fetching chat session:", err);
    return NextResponse.json({ error: "Failed to fetch chat session" }, { status: 500 });
  }
}

//Create a new chat session
export async function POST(req) {
  try {
    const body = await req.json();
    const { order_id, buyer_wallet, seller_wallet, mediator_wallet } = body;

    if (!order_id || !buyer_wallet || !seller_wallet)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Check if session already exists
    const existing = await sql`
      SELECT * FROM verymarket_chat_sessions
      WHERE order_id = ${order_id}
      LIMIT 1;
    `;

    if (existing.rows.length > 0)
      return NextResponse.json(existing.rows[0]);

    // Create new session
    const result = await sql`
      INSERT INTO verymarket_chat_sessions (order_id, buyer_wallet, seller_wallet, mediator_wallet)
      VALUES (${order_id}, ${buyer_wallet}, ${seller_wallet}, ${mediator_wallet || null})
      RETURNING *;
    `;

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating chat session:", err);
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
  }
}
