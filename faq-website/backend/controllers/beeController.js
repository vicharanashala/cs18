const beeService = require('../services/beeService');

exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    const answer = await beeService.chatWithGroq(message, userIp);

    res.status(200).json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('[Bee Controller Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to process AI chat with Groq.' });
  }
};
