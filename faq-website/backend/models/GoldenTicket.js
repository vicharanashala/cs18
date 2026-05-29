const mongoose = require('mongoose');

const goldenTicketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spurtiSpent: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'rejected'],
      default: 'active',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    banIssued: {
      type: Boolean,
      default: false,
    },
    knowledgeCaptured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual for leaderboardWeight (can just use spurtiSpent for ranking, but adding virtual to match schema explicitly)
goldenTicketSchema.virtual('leaderboardWeight').get(function () {
  return this.spurtiSpent;
});

// Ensure virtuals are included in JSON/Object conversions
goldenTicketSchema.set('toJSON', { virtuals: true });
goldenTicketSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GoldenTicket', goldenTicketSchema);
