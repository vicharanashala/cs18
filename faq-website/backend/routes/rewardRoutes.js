const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const authMiddleware = require('../middleware/authMiddleware');

// Legacy — deprecated, returns 410
router.post('/redeem', authMiddleware, rewardController.redeem);

// Leaderboard slice distribution (admin only)
router.post('/leaderboard-reward', authMiddleware, rewardController.awardLeaderboard);

// Get reward configuration
router.get('/config', authMiddleware, rewardController.getRewardConfig);

// Legacy transaction history
router.get('/transactions', authMiddleware, rewardController.getTransactions);

module.exports = router;
