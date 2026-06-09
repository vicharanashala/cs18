const { OpenAI } = require('openai');
const FAQ = require('../models/FAQ');

let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

exports.chatWithKnowledge = async (userMessage) => {
  if (!openai) {
    return "I am currently offline. Please ask the administrator to configure the OpenAI API key.";
  }

  // 1. Basic search to find relevant FAQs
  const words = userMessage.split(/\s+/).filter(w => w.length > 3);
  const regexPatterns = words.map(w => new RegExp(w, 'i'));
  
  let contextFaqs = [];
  if (regexPatterns.length > 0) {
    contextFaqs = await FAQ.find({
      $or: [
        { question: { $in: regexPatterns } },
        { answer: { $in: regexPatterns } }
      ]
    }).limit(5).select('question answer');
  }

  // Fallback to general FAQs if no matches found
  if (contextFaqs.length === 0) {
    contextFaqs = await FAQ.find({}).sort({ viewCount: -1 }).limit(3).select('question answer');
  }

  // 2. Format context
  const contextString = contextFaqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');

  // 3. Call OpenAI
  const systemPrompt = `You are a helpful, conversational AI voice assistant for "FAQ Hive".
You answer user questions specifically using the provided FAQ context.
If the answer is not in the context, gently say that you don't have that information in the database right now, but they can raise a ticket.
Keep your answers conversational and concise, as they will be spoken aloud to the user using text-to-speech. Do not use markdown formatting like bolding or bullet points, just plain readable text.

Here is the context from the FAQ database:
---
${contextString}
---`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
  });

  return completion.choices[0].message.content;
};
