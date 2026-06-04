const aiService = require('../services/aiService');

exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const answer = await aiService.chatWithKnowledge(message);

    res.status(200).json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('[AI Chat Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to process AI chat. Make sure OPENAI_API_KEY is valid.' });
  }
};
