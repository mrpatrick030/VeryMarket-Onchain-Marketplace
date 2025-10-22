import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to convert BigInt to string
const convertBigInt = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, convertBigInt(v)])
    );
  }
  return obj;
};

export async function POST(req) {
  try {
    const body = await req.json();
    let { metrics, prevMetrics, storeCount, salesByToken, salesByCategory, focus } = body;

    // Convert BigInt to string
    metrics = convertBigInt(metrics);
    prevMetrics = convertBigInt(prevMetrics);
    salesByToken = convertBigInt(salesByToken);
    salesByCategory = convertBigInt(salesByCategory);

    if (!metrics || !salesByToken) {
      return new Response(JSON.stringify({ error: "Missing required data" }), { status: 400 });
    }

    const focusText =
      focus === "overall"
        ? "Analyze the overall marketplace performance including orders, store count, and growth rate."
        : focus === "tokens"
        ? "Summarize top-performing tokens based on total sales, and identify performance trends among tokens."
        : "Provide insights on category-level sales trends and growth performance.";

    const prompt = `
You are an expert analytics assistant for a blockchain marketplace called VeryMarket.

Focus: ${focusText}

Use the following data to generate human-friendly insights.

Current Metrics:
${JSON.stringify(metrics, null, 2)}

Previous Metrics:
${JSON.stringify(prevMetrics || {}, null, 2)}

Store Count: ${storeCount}

Sales by Token:
${JSON.stringify(salesByToken, null, 2)}

Sales by Category:
${JSON.stringify(salesByCategory, null, 2)}

Guidelines:
- Provide 4-6 short, actionable insights.
- Use simple, professional language.
- Include emojis where appropriate (📈, 💰, 🏪, ⚡, etc.).
- Mention percentages or growth where visible.
`;

    // Call OpenAI with streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        stream: true,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are a data analytics expert summarizing insights for a crypto marketplace dashboard." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.body) throw new Error("No response body from OpenAI");

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value || new Uint8Array(), { stream: true });

          // Split by newlines and push each line
          const lines = buffer.split("\n").filter(Boolean);
          for (const line of lines) {
            controller.enqueue(line + "\n");
          }

          buffer = ""; // clear buffer
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("AI Insights Streaming Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to stream AI insights", details: err.message }),
      { status: 500 }
    );
  }
}