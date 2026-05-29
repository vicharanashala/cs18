const Groq = require("groq-sdk");

// Initialize Groq client with the API key from environment variables
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateAnswer(query, faqs) {
  try {
    if (!faqs || faqs.length === 0) {
      return "I could not find a relevant FAQ.";
    }

    const topFAQ = faqs[0];

    // If the match confidence is extremely low
    if (topFAQ.percentage < 55) {
      return "I could not find a strongly relevant FAQ, but there may be partially related results below.";
    }

    // Build the prompt context using the top FAQs to give the LLM enough context
    const contextText = faqs
      .filter((faq) => faq.percentage >= 55)
      .map((faq, i) => `FAQ ${i + 1}:\nQ: ${faq.question}\nA: ${faq.answer}`)
      .join("\n\n");

    const systemPrompt = `You are a helpful AI assistant for an internship program. 
Your goal is to answer the user's query based ONLY on the provided FAQ context.
If the answer is not in the context, say that you don't know based on the FAQs.
Keep your answer concise, conversational, and direct.

CONTEXT:
${contextText}`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 500
    });

    return completion.choices[0]?.message?.content || "No response generated.";
  } catch (err) {
    console.log("LLM ERROR (Groq):", err);
    return "Failed to generate answer via Groq API.";
  }
}

module.exports = generateAnswer;