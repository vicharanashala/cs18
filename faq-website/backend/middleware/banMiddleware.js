const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.bannedUntil && user.bannedUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Account temporarily restricted.',
        bannedUntil: user.bannedUntil,
      });
    }

    next();
  } catch (error) {
    console.error('Ban check error:', error);
    res.status(500).json({ success: false, message: 'Server error checking account status.' });
  }
};
