const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Configurable leaderboard rewards (admin can adjust these values)
const LEADERBOARD_REWARDS = {
  1: 6,  // Rank 1 → 6 slices (1 full pizza, redeemable for 1 SP)
  2: 3,  // Rank 2 → 3 slices (half pizza)
  3: 1,  // Rank 3 → 1 slice
};

/**
 * Award pizza slices to a user based on their leaderboard rank.
 * @param {string} userId - The MongoDB user ID
 * @param {number} rank - The leaderboard rank (1, 2, or 3)
 */
async function awardLeaderboardSlices(userId, rank) {
  const slicesToAward = LEADERBOARD_REWARDS[rank];
  if (!slicesToAward) throw new Error(`No reward configured for rank ${rank}`);

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.pizzaSlices += slicesToAward;
  await user.save();

  const transaction = new Transaction({
    userId: user._id,
    type: 'pizza_slice_earned',
    amount: slicesToAward,
    direction: 'credit',
    title: `Leaderboard Rank #${rank} Reward`,
    description: `Earned ${slicesToAward} pizza slice${slicesToAward !== 1 ? 's' : ''} for ranking #${rank} on the leaderboard`,
    tags: ['pizza', 'rewards'],
    metadata: { rank, slicesAwarded: slicesToAward }
  });
  await transaction.save();

  return { user, transaction, slicesAwarded: slicesToAward };
}

// POST /api/rewards/leaderboard-reward
// Body: { userId, rank }
exports.awardLeaderboard = async (req, res) => {
  try {
    const { userId, rank } = req.body;
    if (!userId || !rank) {
      return res.status(400).json({ error: 'userId and rank are required' });
    }
    const numRank = Number(rank);
    if (![1, 2, 3].includes(numRank)) {
      return res.status(400).json({ error: 'Rank must be 1, 2, or 3' });
    }

    const result = await awardLeaderboardSlices(userId, numRank);

    res.json({
      success: true,
      message: `Awarded ${result.slicesAwarded} pizza slice(s) to user for rank #${numRank}`,
      pizzaSlices: result.user.pizzaSlices,
      slicesAwarded: result.slicesAwarded
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/rewards/config
exports.getRewardConfig = async (req, res) => {
  res.json({ leaderboardRewards: LEADERBOARD_REWARDS });
};

// Legacy redeem endpoint — deprecated, kept for backward compatibility
exports.redeem = async (req, res) => {
  return res.status(410).json({
    error: 'This endpoint is deprecated. Use POST /api/wallet/redeem-pizza instead.',
    hint: '6 pizza slices = 1 Spurti Point'
  });
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { ...exports, awardLeaderboardSlices, LEADERBOARD_REWARDS };
