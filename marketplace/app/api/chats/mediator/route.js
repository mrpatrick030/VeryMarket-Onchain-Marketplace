import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

//PATCH - Mediator joins a chat
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { session_id, mediator_wallet } = body;

    if (!session_id || !mediator_wallet)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const result = await sql`
      UPDATE verymarket_chat_sessions
      SET mediator_wallet = ${mediator_wallet}, mediator_joined = true
      WHERE id = ${session_id}
      RETURNING *;
    `;

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.log("Error updating mediator join:", err);
    return NextResponse.json({ error: "Failed to update mediator" }, { status: 500 });
  }
}
