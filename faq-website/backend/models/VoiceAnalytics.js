const mongoose = require('mongoose');

const voiceAnalyticsSchema = new mongoose.Schema({
  queryLength: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  tokensUsed: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: null }
}, {
  timestamps: false
});

module.exports = mongoose.model('VoiceAnalytics', voiceAnalyticsSchema);
