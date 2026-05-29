const mongoose = require('mongoose');

const deflectionAnalyticsSchema = new mongoose.Schema({
  originalQuery: { type: String, required: true },
  deflectedByFaqId: { type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' },
  deflectedByDiscussionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster' }, // Using SemanticCluster for discussions
  deflectedByTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalTicket' },
  category: { type: String },
  sessionId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('DeflectionAnalytics', deflectionAnalyticsSchema);
