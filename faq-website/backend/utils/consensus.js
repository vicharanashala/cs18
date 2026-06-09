const Groq = require('groq-sdk');
const SemanticCluster = require('../models/SemanticCluster');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { recordTransaction } = require('./walletHelper');
const expertiseService = require('../services/expertise.service');

let groq;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function generateConsensus(clusterId) {
  try {
    const cluster = await SemanticCluster.findById(clusterId);
    if (!cluster) return;
    
    if (!groq) {
      console.warn("Consensus generation skipped: GROQ_API_KEY is missing.");
      return;
    }

    const answers = await Answer.find({ clusterId }).populate('userId', 'email reputation');

    // Prepare prompt
    const answerContext = answers.map((a, i) => `Answer ${i + 1} (Author Reputation: ${a.userReputationAtTimeOfPost}): ${a.text}`).join('\n\n');

    const prompt = `You are an expert community admin or mentor. We have a discussion thread with multiple answers.
Your goal is to synthesize the best, most accurate consolidated answer based strictly on the provided answers.
Pay closer attention to answers from authors with higher reputation scores.
Avoid hallucinations. Highlight the strongest consensus.

Original Question: ${cluster.canonicalQuestion}
Context: ${cluster.context}

User Answers:
${answerContext}

Return ONLY the final consolidated answer in clear markdown format. Do not include introductory text like "Here is the consolidated answer:".`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 800
    });

    const finalAnswer = completion.choices[0]?.message?.content || 'Consensus generation failed.';

    // Now, determine the absolute best contributor
    const rewardPrompt = `We have a final consolidated answer and multiple original user answers.
Identify the SINGLE answer that contributed the MOST semantic value to the final answer.
Return the result strictly as a JSON array containing a single integer representing the Answer index. Example: [3]. Do not return anything else.

Final Answer: ${finalAnswer}

User Answers:
${answers.map((a, i) => `Answer ${i + 1}: ${a.text}`).join('\n\n')}`;

    const rewardCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: rewardPrompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 50
    });

    let topIndices = [];
    try {
      topIndices = JSON.parse(rewardCompletion.choices[0]?.message?.content.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      console.log('Reward parsing failed, distributing to first answer as fallback');
      topIndices = [1];
    }

    // Reward only the single best answer
    if (topIndices.length > 0) {
      const answerIndex = topIndices[0] - 1;
      const winnerAnswer = answers[answerIndex];
      if (winnerAnswer && winnerAnswer.userId) {
        await recordTransaction({
          userId: winnerAnswer.userId._id,
          type: 'PIZZA_EARNED',
          amount: 1,
          direction: 'credit',
          description: `Earned +1 Pizza for the best answer on discussion: "${cluster.canonicalQuestion}"`,
          metadata: {
            clusterId: cluster._id,
            question: cluster.canonicalQuestion
          }
        });
        
        // Phase 6A: Track accepted answer
        await expertiseService.recordAcceptedAnswer(winnerAnswer.userId._id, cluster.category);
      }
    }

    cluster.aiGeneratedAnswer = finalAnswer + '\n\n*Consensus reached. Top contributor earned 1 Pizza.*';
    cluster.status = 'ADMIN_REVIEW';
    await cluster.save();

  } catch (err) {
    console.error('Consensus Generation Error:', err);
  }
}

module.exports = { generateConsensus };
