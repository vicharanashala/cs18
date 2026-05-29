const mongoose = require('mongoose');

const searchAnalyticsSchema = new mongoose.Schema({
  query: { type: String, required: true },
  normalizedQuery: { type: String, required: true },
  category: { type: String }, // Optional category filter applied during search
  resultCount: { type: Number, required: true, default: 0 },
  sessionId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now, index: true },
  isFailed: { type: Boolean, default: false }
});

// Create compound indexes to optimize aggregation
searchAnalyticsSchema.index({ normalizedQuery: 1, timestamp: -1 });
searchAnalyticsSchema.index({ isFailed: 1, timestamp: -1 });
searchAnalyticsSchema.index({ category: 1, timestamp: -1 });

module.exports = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
