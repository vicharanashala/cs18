const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { recordTransaction, SLICES_PER_SP } = require('../utils/walletHelper');

// Helper: resolve tags for legacy transactions that lack a tags array
const getLegacyTags = (tx) => {
  const tags = [];
  const type = tx.type;
  const direction = tx.direction;
  const amount = tx.amount;
  const description = tx.description || tx.title || '';

  if (type === 'GOLDEN_TICKET_SPENT' || type === 'golden_ticket_creation' || description.toLowerCase().includes('golden ticket')) {
    tags.push('sp_spent', 'golden_ticket');
  } else if (type === 'GOLDEN_TICKET_REFUND') {
    tags.push('sp_earned', 'golden_ticket');
  } else if (type === 'pizza_redemption' || type === 'PIZZA_REDEEMED' || (type === 'REDEEM' && (tx.currency === 'pizza' || description.toLowerCase().includes('pizza')))) {
    tags.push('pizza', 'sp_earned', 'rewards');
  } else if (type === 'pizza_slice_earned' || type === 'PIZZA_SLICE_EARNED') {
    tags.push('pizza', 'rewards');
  } else if (type === 'EARNED_SP') {
    tags.push('sp_earned');
  } else if (type === 'SPENT_SP') {
    tags.push('sp_spent');
  } else if (type === 'PIZZA_EARNED') {
    tags.push('pizza');
  } else if (['ADMIN_REWARD', 'DISCUSSION_REWARD', 'FAQ_CONTRIBUTION_REWARD'].includes(type)) {
    tags.push('sp_earned', 'rewards');
  } else if (type === 'SYSTEM_ADJUSTMENT') {
    if (direction === 'credit' || amount > 0) tags.push('sp_earned');
    if (direction === 'debit' || amount < 0) tags.push('sp_spent');
  }

  if (amount < 0 && !tags.includes('sp_spent') && !tags.includes('pizza')) {
    tags.push('sp_spent');
  }
  if (amount > 0 && direction === 'credit' && !tags.includes('pizza') && !tags.includes('sp_earned')) {
    tags.push('sp_earned');
  }
  return Array.from(new Set(tags));
};

// GET /api/wallet/balance
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({ userId: req.user.id }).lean();

    // Default starting balance is 100 SP.
    let lifetimeEarned = 100;
    let lifetimeSpent = 0;

    for (const tx of transactions) {
      const tags = (tx.tags && tx.tags.length > 0) ? tx.tags : getLegacyTags(tx);

      const isSpSpent = tags.includes('sp_spent') || (tx.amount < 0 && !tags.includes('pizza'));
      const isSpEarned = tags.includes('sp_earned') || (tx.amount > 0 && !tags.includes('pizza') && tx.type !== 'PIZZA_EARNED' && tx.type !== 'pizza_slice_earned');

      if (isSpSpent) {
        lifetimeSpent += Math.abs(tx.amount);
      } else if (isSpEarned) {
        lifetimeEarned += Math.abs(tx.amount);
      }
    }

    res.json({
      success: true,
      spurtiPoints: user.spurtiPoints,
      pizzaSlices: user.pizzaSlices,
      // Legacy field for backward compat — always 0 in new system
      pizzas: 0,
      lifetimeEarned,
      lifetimeSpent,
      slicesPerSP: SLICES_PER_SP
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/wallet/history
exports.getHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();

    const mappedTransactions = transactions.map(tx => ({
      ...tx,
      tags: (tx.tags && tx.tags.length > 0) ? tx.tags : getLegacyTags(tx)
    }));

    res.json({ success: true, transactions: mappedTransactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/wallet/redeem-pizza
// Redeems all available full pizzas (multiples of 6 slices) for Spurti Points
exports.redeemPizza = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pizzasToRedeem = Math.floor(user.pizzaSlices / SLICES_PER_SP);

    if (pizzasToRedeem < 1) {
      return res.status(400).json({
        error: `Insufficient pizza slices. You need at least ${SLICES_PER_SP} slices to redeem 1 SP. You have ${user.pizzaSlices}.`,
        pizzaSlices: user.pizzaSlices,
        slicesNeeded: SLICES_PER_SP - user.pizzaSlices
      });
    }

    const slicesSpent = pizzasToRedeem * SLICES_PER_SP;
    const spGained = pizzasToRedeem;

    await recordTransaction({
      userId: user._id,
      type: 'pizza_redemption',
      amount: spGained, // SP earned
      direction: 'credit',
      title: 'Pizza Redemption',
      description: `Redeemed ${pizzasToRedeem} Pizza${pizzasToRedeem === 1 ? '' : 's'} (${slicesSpent} slices) for ${spGained} Spurti Point${spGained === 1 ? '' : 's'}`,
      tags: ['pizza', 'sp_earned', 'rewards'],
      metadata: { pizzaSlicesSpent: slicesSpent, spGained: spGained }
    });

    const updatedUser = await User.findById(req.user.id);

    res.json({
      success: true,
      message: `Successfully redeemed ${pizzasToRedeem} Pizza${pizzasToRedeem === 1 ? '' : 's'}! +${spGained} SP earned.`,
      spurtiPoints: updatedUser.spurtiPoints,
      pizzaSlices: updatedUser.pizzaSlices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
