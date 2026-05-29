const User = require('../models/User');
const Transaction = require('../models/Transaction');

const SLICES_PER_SP = 6; // 6 pizza slices = 1 Spurti Point

/**
 * Unified utility to record a wallet transaction and adjust User balances.
 * Prevents sync issues and enforces backend balance validation.
 */
async function recordTransaction({ userId, type, amount, direction, description, title, metadata = {}, tags = [] }) {
  if (!userId || !type || amount === undefined || !direction) {
    throw new Error('Invalid or missing transaction details');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const absAmount = Math.abs(amount);
  const isDebit = direction === 'debit' || amount < 0;
  const upperType = type.toUpperCase();

  // Pre-validation
  if (isDebit) {
    const isPizzaOp = upperType.includes('PIZZA') || type === 'pizza_redemption';
    if (isPizzaOp) {
      const slicesToCheck = metadata.pizzaSlicesSpent || absAmount;
      if (user.pizzaSlices < slicesToCheck) {
        throw new Error('Insufficient pizza slices');
      }
    } else {
      if (user.spurtiPoints < absAmount) {
        throw new Error('Insufficient Spurti Points');
      }
    }
  }

  // Determine tags
  let calculatedTags = [];
  if (type === 'golden_ticket_creation' || upperType === 'GOLDEN_TICKET_SPENT') {
    calculatedTags = ['sp_spent', 'golden_ticket'];
  } else if (upperType === 'GOLDEN_TICKET_REFUND') {
    calculatedTags = ['sp_earned', 'golden_ticket'];
  } else if (type === 'pizza_redemption') {
    calculatedTags = ['pizza', 'sp_earned', 'rewards'];
  } else if (type === 'pizza_slice_earned' || upperType === 'PIZZA_SLICE_EARNED') {
    calculatedTags = ['pizza', 'rewards'];
  } else if (upperType === 'EARNED_SP') {
    calculatedTags = ['sp_earned'];
  } else if (upperType === 'SPENT_SP') {
    calculatedTags = ['sp_spent'];
  } else if (upperType === 'PIZZA_EARNED' || upperType === 'PIZZA_REDEEMED') {
    calculatedTags = ['pizza'];
  } else if (['ADMIN_REWARD', 'DISCUSSION_REWARD', 'FAQ_CONTRIBUTION_REWARD'].includes(upperType)) {
    calculatedTags = ['sp_earned', 'rewards'];
  } else if (upperType === 'SYSTEM_ADJUSTMENT') {
    calculatedTags = direction === 'credit' ? ['sp_earned'] : ['sp_spent'];
  }

  const mergedTags = Array.from(new Set([...calculatedTags, ...(metadata.tags || []), ...(tags || [])]));

  // Create the transaction record
  const transaction = new Transaction({
    userId,
    type,
    amount,
    direction,
    description: description || title,
    title: title || description,
    metadata,
    tags: mergedTags
  });
  await transaction.save();

  // Apply balance mutations
  if (type === 'pizza_redemption') {
    const slicesSpent = metadata.pizzaSlicesSpent || SLICES_PER_SP;
    if (user.pizzaSlices < slicesSpent) {
      throw new Error('Insufficient pizza slices');
    }
    user.pizzaSlices = Math.max(0, user.pizzaSlices - slicesSpent);
    user.spurtiPoints += absAmount; // absAmount is the SP gained (always 1)
  } else if (type === 'pizza_slice_earned' || upperType === 'PIZZA_SLICE_EARNED') {
    user.pizzaSlices += absAmount;
  } else if (upperType === 'BOOST_ACTIVATED') {
    // Deduct 1 pizza slice for a boost
    const slicesToCheck = metadata.pizzaSlicesSpent || 1;
    if (user.pizzaSlices < slicesToCheck) {
      throw new Error('Insufficient pizza slices');
    }
    user.pizzaSlices = Math.max(0, user.pizzaSlices - slicesToCheck);
  } else if (type === 'golden_ticket_creation') {
    if (user.spurtiPoints < absAmount) {
      throw new Error('Insufficient Spurti Points');
    }
    user.spurtiPoints = Math.max(0, user.spurtiPoints - absAmount);
  } else if (upperType.includes('PIZZA') && type !== 'pizza_redemption') {
    // Legacy pizza field handling
    if (isDebit) {
      user.pizzaSlices = Math.max(0, user.pizzaSlices - absAmount);
    } else {
      user.pizzaSlices += absAmount;
    }
  } else {
    // Spurti Points
    if (isDebit) {
      user.spurtiPoints = Math.max(0, user.spurtiPoints - absAmount);
    } else {
      user.spurtiPoints += absAmount;
    }
  }

  await user.save();
  return transaction;
}

module.exports = { recordTransaction, SLICES_PER_SP };
