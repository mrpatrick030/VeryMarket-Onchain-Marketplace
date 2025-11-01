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

    // payload from analytics insights
    let {
      metrics,
      storeCount,
      salesByToken,
      salesByCategory,
      statusCounts,
      categoryCounts,
      TOKEN_LOGOS,
      viewMode,
      focus,
    } = body;

    // Convert BigInt values to strings
    metrics = convertBigInt(metrics);
    salesByToken = convertBigInt(salesByToken);
    salesByCategory = convertBigInt(salesByCategory);
    storeCount = convertBigInt(storeCount);
    statusCounts = convertBigInt(statusCounts);
    categoryCounts = convertBigInt(categoryCounts);
    TOKEN_LOGOS = convertBigInt(TOKEN_LOGOS);
    viewMode = convertBigInt(viewMode)

    // focus text for AI prompt
    const focusText =
      focus === "overall"
        ? "Analyze the overall marketplace metrics performance including total orders, completed orders, disputed orders, active listings, store count, and growth rate."
        : focus === "tokens"
        ? "Summarize top-performing tokens based on total sales, and identify performance trends among tokens."
        : "Provide insights on category-level sales trends and growth performance.";

    // Construct AI prompt
    const prompt = `
You are an expert analytics assistant for a Hedera network decentralized on-chain marketplace called VeryMarket.

Focus: ${focusText}

Use the following data to generate human-friendly insights.

Current Metrics:
${JSON.stringify(metrics, null, 2)}

Store Count: ${storeCount}

Sales by Token:
${JSON.stringify(salesByToken || {}, null, 2)}

Sales by Category:
${JSON.stringify(salesByCategory || {}, null, 2)}

Status Counts:
${JSON.stringify(statusCounts || {}, null, 2)}

Category Counts:
${JSON.stringify(categoryCounts || {}, null, 2)}

viewMode:
${JSON.stringify(viewMode || {}, null, 2)}

Guidelines:
- Provide 4-6 short, actionable insights.
- View mode tells the kind of user interacting currently if he is getting global VeryMarket insights, as a buyer getting buyer insights, or as a seller getting seller insights.
- Use simple, professional language.
- Include emojis where appropriate (📈, 💰, 🏪, ⚡, etc.).
- Use the contract names for the contract addresses in ${JSON.stringify(TOKEN_LOGOS)} for the analysis.
- Mention percentages or growth where visible.
`;

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
  } catch (err) {
    console.log("AI Insights Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate AI insights", details: err.message }),
      { status: 500 }
    );
  }
}