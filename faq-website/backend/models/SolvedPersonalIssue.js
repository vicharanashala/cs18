const mongoose = require('mongoose');

const solvedPersonalIssueSchema = new mongoose.Schema({
  normalizedIntent: { type: String, required: true },
  embedding: { type: [Number], required: true },
  verifiedAnswer: { type: String, required: true },
  institution: { type: String, required: true, index: true },
  category: { type: String, required: true },
  customCategory: { type: String },
  tags: { type: [String], default: [] },
  quirks: { type: String },
  adminMetadata: { type: mongoose.Schema.Types.Mixed },
  helpfulnessHistory: {
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('SolvedPersonalIssue', solvedPersonalIssueSchema);
