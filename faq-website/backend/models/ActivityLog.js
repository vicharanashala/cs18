const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: {
    type: String,
    enum: [
      'question_asked',
      'contribution_submitted',
      'faq_approved',
      'answer_posted',
      'attachment_uploaded',
      'ticket_resolved',
      'sp_earned',
      'role_changed',
      'warning_received',
      'suspension',
      'ban',
    ],
    required: true,
  },
  description: { type: String, required: true },
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);