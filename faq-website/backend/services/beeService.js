const Groq = require('groq-sdk');
const FAQ = require('../models/FAQ');
const SystemSettings = require('../models/SystemSettings');
const VoiceAnalytics = require('../models/VoiceAnalytics');

let groq;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

exports.chatWithGroq = async (userMessage, userIp) => {
  if (!groq) {
    return "I am currently offline. The Groq API key is missing from the server environment.";
  }

  const startTime = Date.now();
  let tokensUsed = 0;

  try {
    const settings = await SystemSettings.get();
    
    if (!settings.beeEnabled) {
      return "The Voice Assistant is currently disabled by the administrator.";
    }

    // 1. Basic search to find relevant FAQs (RAG implementation)
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

    // Fallback to general/popular FAQs if no matches found
    if (contextFaqs.length === 0) {
      contextFaqs = await FAQ.find({}).sort({ viewCount: -1 }).limit(3).select('question answer');
    }

    // 2. Format context
    const contextString = contextFaqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');

    // 3. System Prompt setup
    const systemPrompt = `${settings.beeSystemPrompt || 'You are Bee, a helpful AI assistant.'}

FAQ Context:
${contextString}`;

    // 4. Call Groq
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.5,
      max_tokens: 250, // Keep responses short and snappy for TTS
    });

    tokensUsed = completion.usage?.total_tokens || 0;
    const answer = completion.choices[0]?.message?.content || "Sorry, I couldn't process your request.";

    // Log Analytics asynchronously
    const latencyMs = Date.now() - startTime;
    VoiceAnalytics.create({
      queryLength: userMessage.length,
      latencyMs,
      tokensUsed,
      success: true,
      ip: userIp
    }).catch(err => console.error("Failed to log voice analytics:", err));

    return answer;
  } catch (error) {
    console.error('[Groq Chat Error]:', error);
    
    const latencyMs = Date.now() - startTime;
    VoiceAnalytics.create({
      queryLength: userMessage.length,
      latencyMs,
      tokensUsed: 0,
      success: false,
      ip: userIp
    }).catch(err => console.error("Failed to log voice analytics:", err));

    if (error.status === 503 || error.status === 429) {
      return "I'm currently receiving too many requests. Please try again in a moment.";
    }
    throw error;
  }
};
