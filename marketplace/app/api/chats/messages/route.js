import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

//Fetch messages for a session 
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId)
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  try {
    const messages = await sql`
      SELECT * FROM verymarketchats
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC;
    `;
    return NextResponse.json(messages.rows || []);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

//Send message or file
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      session_id,
      sender_wallet,
      receiver_wallet,
      message,
      attachment_url,
    } = body;

    // Validate required fields
    if (!session_id || !sender_wallet || !receiver_wallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent empty message and no file
    if (!message?.trim() && !attachment_url) {
      return NextResponse.json(
        { error: "Cannot send empty message" },
        { status: 400 }
      );
    }

    // Insert message with optional attachment
    const result = await sql`
      INSERT INTO verymarketchats (
        session_id,
        sender_wallet,
        receiver_wallet,
        message,
        attachment_url
      )
      VALUES (
        ${session_id},
        ${sender_wallet},
        ${receiver_wallet},
        ${message || ""},
        ${attachment_url || null}
      )
      RETURNING *;
    `;

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Error sending message:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}