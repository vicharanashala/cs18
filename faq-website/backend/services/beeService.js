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
    const systemPrompt = `${settings.beeSystemPrompt || 'You are Bee, a helpful AI assistant.'}\n\nFAQ Context:\n${contextString}`;

    // Detailed Logging Setup
    const provider = 'Groq';
    const model = 'llama-3.3-70b-versatile';
    const requestPayload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.5,
      max_tokens: 250,
    };

    console.log(`\n=== BEE REQUEST TRACE ===`);
    console.log(`Provider: ${provider}`);
    console.log(`Model: ${model}`);
    console.log(`Request Payload:`, JSON.stringify(requestPayload, null, 2));

    let answer = '';
    
    try {
      // 4. Call Groq
      const completion = await groq.chat.completions.create(requestPayload);
      console.log(`Provider Response:`, JSON.stringify(completion, null, 2));
      
      tokensUsed = completion.usage?.total_tokens || 0;
      answer = completion.choices[0]?.message?.content || "Sorry, I couldn't process your request.";
    } catch (apiError) {
      console.error(`\n=== BEE API ERROR ===`);
      console.error(`Provider Error Stack Trace:`, apiError.stack || apiError);
      
      // Graceful fallback if the AI provider fails (e.g., 401 Invalid API Key)
      console.log(`Falling back to local FAQ context due to API failure.`);
      answer = `[AI Fallback Mode] Here is the most relevant information I found:\n\n${contextString}`;
    }

    // Log Analytics asynchronously
    const latencyMs = Date.now() - startTime;
    VoiceAnalytics.create({
      queryLength: userMessage.length,
      latencyMs,
      tokensUsed,
      success: true, // We consider it a success if we successfully return an answer (even a fallback)
      ip: userIp
    }).catch(err => console.error("Failed to log voice analytics:", err));

    return answer;
  } catch (error) {
    console.error('[Bee Service Error] Stack Trace:', error.stack || error);
    
    const latencyMs = Date.now() - startTime;
    VoiceAnalytics.create({
      queryLength: userMessage.length,
      latencyMs,
      tokensUsed: 0,
      success: false,
      ip: userIp
    }).catch(err => console.error("Failed to log voice analytics:", err));

    if (error.status === 503 || error.status === 429) {
      throw new Error("I'm currently receiving too many requests. Please try again in a moment.");
    }
    throw new Error(`AI Service Error: ${error.message}`);
  }
};
