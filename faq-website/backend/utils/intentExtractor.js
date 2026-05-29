const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function extractPersonalIntent(question, context) {
  try {
    const prompt = `You are an expert intent extraction system for an internship support platform.
We need to normalize personal student issues into clear, concise, and generalized semantic intents.
Extract the following details from the user's issue:
1. Core problem: What is the main issue the student is facing?
2. Category: The broad process category (e.g. NOC, Offer Letter, Document Upload, Portal Access, Stipend, Verification).
3. Sub-requirement: Any institution-specific or workflow-specific sub-requirement, formatting rule, naming mismatch, dual approval, timing, etc.
4. Normalized Intent: A standardized, normalized description of the problem (e.g. "multiple NOC approvals required", "offer letter identity mismatch", "portal login failure due to credential mismatch").

Student's Title: "${question}"
Student's Context: "${context}"

Provide the output in JSON format with the keys:
- coreProblem
- category
- subRequirement
- normalizedIntent

Return ONLY the JSON object. Do not include markdown code block syntax (like \`\`\`json).`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    
    // Ensure fallback fields exist
    return {
      coreProblem: result.coreProblem || question,
      category: result.category || "General",
      subRequirement: result.subRequirement || "None",
      normalizedIntent: result.normalizedIntent || question
    };
  } catch (err) {
    console.error("Intent extraction failed:", err);
    return {
      coreProblem: question,
      category: "General",
      subRequirement: "None",
      normalizedIntent: question
    };
  }
}

module.exports = { extractPersonalIntent };
