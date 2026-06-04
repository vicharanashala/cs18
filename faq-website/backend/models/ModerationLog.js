const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['warning', 'suspension', 'ban', 'unban', 'unsuspend', 'role_change', 'mentor_assign', 'mentor_remove'],
    required: true,
  },
  reason:     { type: String, default: '' },
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);