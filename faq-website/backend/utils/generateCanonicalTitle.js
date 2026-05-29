const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const STOP_WORDS = new Set(['the','is','in','at','of','on','and','a','to','it','for','with','as','that','this','my','i','you','can','how','what','why','when','where', 'have', 'from', 'are', 'be', 'do', 'we']);

function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const frequency = {};
  for(let w of words) {
    if(w.length > 3 && !STOP_WORDS.has(w)) {
      frequency[w] = (frequency[w] || 0) + 1;
    }
  }
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(entry => entry[0]);
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const valid = tags.map(t => {
     return String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
  }).filter(t => t.length > 2 && t.length < 20);
  return [...new Set(valid)].slice(0, 8);
}

async function generateCanonicalTitle(rawQuestion, context) {
  let fallbackTags = [];
  try {
    fallbackTags = sanitizeTags(extractKeywords(`${rawQuestion} ${context}`));
  } catch (e) {
    console.error("[TAGGING] Failed to extract fallback tags", e);
  }

  try {
    const systemPrompt = `You are a semantic processing engine for a community FAQ platform.
Your task is to take a messy, raw student question and background context, and output a clean, concise, searchable intent question, along with 3-6 relevant tags.

Follow these strict rules:
1. canonicalQuestion:
   - Extract the core user intent.
   - Clean up slang, typos, and poor grammar.
   - Normalize into a proper, professional, and concise FAQ-style question.
   - Example Input: "GUYD CAN I MAKE YOU MY NEW FRIENDS MY OLD WERE BAD" -> "How can I make new friends after a bad social experience?"
2. hashtags:
   - Generate 3-6 highly relevant, specific tags based on the topic.
   - MUST be lowercased.
   - Do NOT include filler words, stopwords, or generic garbage tags.
   - Do NOT use special characters, spaces, or hashes (#) in the strings.
   - Use meaningful keywords (e.g., "internship", "schedule", "cohort").

You MUST respond in pure JSON format matching this schema:
{
  "canonicalQuestion": "string",
  "hashtags": ["string"]
}
`;

    const userPrompt = `Raw Question: ${rawQuestion}\nContext: ${context}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (responseText) {
      const parsed = JSON.parse(responseText);
      let aiTags = sanitizeTags(parsed.hashtags || []);
      
      if (aiTags.length === 0) {
        console.warn("[TAGGING] AI returned empty tags, applying fallback.");
        aiTags = fallbackTags;
      } else {
        console.log(`[TAGGING] AI successfully generated tags: [${aiTags.join(', ')}]`);
      }

      return {
        canonicalQuestion: parsed.canonicalQuestion || rawQuestion,
        hashtags: aiTags
      };
    }
    
    console.warn("[TAGGING] AI returned empty response, applying fallback.");
    return { canonicalQuestion: rawQuestion, hashtags: fallbackTags };
  } catch (err) {
    console.log("[TAGGING ERROR] LLM generation failed:", err.message);
    console.log(`[TAGGING] Applying fallback tags: [${fallbackTags.join(', ')}]`);
    return { canonicalQuestion: rawQuestion, hashtags: fallbackTags };
  }
}

module.exports = { generateCanonicalTitle, extractKeywords, sanitizeTags };
