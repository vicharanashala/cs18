const mongoose = require('mongoose');
const { FAQ_CATEGORIES } = require('../utils/constants');

const faqSchema = new mongoose.Schema({
  embedding: { type: [Number], select: false },
  clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster' },
  category: { type: String, enum: FAQ_CATEGORIES, default: 'Other' },
  customCategory: { type: String },
  hashtags: { type: [String], default: [] },
  question: { type: String, required: true },
  answer: { type: String, required: true },

  viewCount:    { type: Number, default: 0 },
  /** Separate counter for unauthenticated (guest) public views — does NOT affect engagement / reputation */
  publicViews:  { type: Number, default: 0 },
  totalReadTime: { type: Number, default: 0 },
  averageReadTime: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  recentViewsBoost: { type: Number, default: 0 },
  recentViewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date, default: Date.now },
  wordCount: { type: Number, default: 0 },
  
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  feedbackUsers: { type: [String], default: [] },
  needsReview: { type: Boolean, default: false },
  
  // Memory Decay Tracking
  lastValidatedAt: { type: Date, default: Date.now },
  freshnessScore: { type: Number, default: 100 }
}, { timestamps: true });

faqSchema.pre('save', async function () {
  if (this.isModified('question') || this.isModified('answer') || this.wordCount === undefined) {
    const text = `${this.question || ''} ${this.answer || ''}`;
    this.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  }
});

module.exports = mongoose.model('FAQ', faqSchema);