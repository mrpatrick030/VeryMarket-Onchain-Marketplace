import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    // Fixed test values
    const testMetrics = { totalSales: 1000, totalOrders: 50 };
    const testPrevMetrics = { totalSales: 900, totalOrders: 45 };
    const testStoreCount = 5;

    const prompt = `
You are an analytics assistant. Summarize the following data in 2 short sentences.

Current Metrics:
${JSON.stringify(testMetrics, null, 2)}

Previous Metrics:
${JSON.stringify(testPrevMetrics, null, 2)}

Store Count: ${testStoreCount}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful analytics assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;

    console.log("✅ OpenAI Response:", text);

    return new Response(JSON.stringify({ success: true, text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Test Insights Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}