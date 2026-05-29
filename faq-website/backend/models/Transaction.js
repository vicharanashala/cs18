const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'EARNED_SP',
      'SPENT_SP',
      'PIZZA_EARNED',
      'PIZZA_REDEEMED',
      'GOLDEN_TICKET_SPENT',
      'GOLDEN_TICKET_REFUND',
      'ADMIN_REWARD',
      'DISCUSSION_REWARD',
      'FAQ_CONTRIBUTION_REWARD',
      'SYSTEM_ADJUSTMENT',
      'golden_ticket_creation',
      'pizza_redemption',
      'BOOST_ACTIVATED',
      'REDEEM'
    ], 
    required: true 
  },
  amount: { type: Number, required: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String },
  title: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  tags: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
