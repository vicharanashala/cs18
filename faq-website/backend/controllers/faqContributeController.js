const Groq = require('groq-sdk');
const ContributedFAQ = require('../models/ContributedFAQ');
const FAQ = require('../models/FAQ');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- AI Generalization ---
async function generalizeFAQ(question, answer) {
  try {
    const prompt = `Rewrite the following question and answer into a concise, generalized FAQ entry suitable for a public internship knowledge base.

Rules:
- Remove all personal references (names, emails, specific dates, "I", "my", "me")
- Rewrite question in third-person neutral form
- Keep the answer factual, professional, and concise
- Match the tone of a formal FAQ knowledge base
- Do NOT add any preamble or commentary
- Respond ONLY in this exact JSON format:
{"question":"<generalized question>","answer":"<generalized answer>"}

Original Question: ${question}
Original Answer: ${answer}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192',
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Groq response');
    const parsed = JSON.parse(jsonMatch[0]);
    return { generatedQuestion: parsed.question, generatedAnswer: parsed.answer };
  } catch (err) {
    console.error('[FAQ Generalize Error]', err.message);
    // Fallback: return originals
    return { generatedQuestion: question, generatedAnswer: answer };
  }
}

// --- Duplicate Check ---
async function checkDuplicate(question) {
  const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  if (words.length === 0) return null;
  const regex = words.slice(0, 5).map(w => `(?=.*${w})`).join('');
  const existing = await FAQ.findOne({ question: { $regex: new RegExp(regex, 'i') } })
    .populate('categoryId', 'name');
  return existing;
}

// POST /api/faqs/contribute
exports.contribute = async (req, res, next) => {
  try {
    const { category, customCategory, question, answer, attachments } = req.body;
    const userId = req.user?.id;

    if (!category || !question?.trim() || !answer?.trim()) {
      return res.status(400).json({ success: false, message: 'Category, question, and answer are required.' });
    }

    if (category === 'Other' && (!customCategory || !customCategory.trim())) {
      return res.status(400).json({ success: false, message: 'Please specify your custom category.' });
    }

    // Duplicate detection
    const duplicate = await checkDuplicate(question);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'A similar FAQ already exists.',
        existing: {
          question: duplicate.question,
          category: duplicate.categoryId?.name,
        },
      });
    }

    // AI generalization
    const { generatedQuestion, generatedAnswer } = await generalizeFAQ(question, answer);

    // Save
    const contribution = await ContributedFAQ.create({
      originalQuestion: question.trim(),
      originalAnswer: answer.trim(),
      generatedQuestion,
      generatedAnswer,
      category,
      customCategory,
      contributedBy: userId,
      sourceType: 'community',
      attachments: attachments || [],
    });

    res.status(201).json({
      success: true,
      message: 'FAQ contributed successfully! It will be reviewed and added to the knowledge base.',
      contribution: {
        generatedQuestion,
        generatedAnswer,
        category,
        customCategory
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/faqs/contributed (admin view)
exports.getContributions = async (req, res, next) => {
  try {
    const contributions = await ContributedFAQ.find()
      .populate('contributedBy', 'email')
      .sort({ createdAt: -1 });
    res.json({ success: true, contributions });
  } catch (err) {
    next(err);
  }
};
