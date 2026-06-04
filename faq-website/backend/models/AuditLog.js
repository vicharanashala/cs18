/**
 * AuditLog — immutable append-only record of every admin action.
 * Records who did what, when, and why.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, refPath: 'adminType', default: null },
  adminType:  { type: String, enum: ['Admin', 'User'], default: 'Admin' },
  adminEmail: { type: String, required: true },

  action: {
    type: String,
    required: true,
    enum: [
      // User management
      'USER_BANNED', 'USER_UNBANNED',
      'USER_SUSPENDED',
      'USER_ROLE_CHANGED',
      'PIZZA_GRANTED', 'PIZZA_REVOKED', 'PIZZA_SET', 'PIZZA_RESET',
      'PIZZA_MIGRATION_APPLIED',
      'SPURTI_GRANTED', 'SPURTI_REVOKED', 'SPURTI_SET',
      'REPUTATION_ADJUSTED',
      'GT_COOLDOWN_RESET',
      // FAQ CRUD
      'FAQ_CREATED', 'FAQ_EDITED', 'FAQ_DELETED',
      'FAQ_ARCHIVED', 'FAQ_RESTORED',
      'FAQ_FEATURED', 'FAQ_UNFEATURED',
      'FAQ_PINNED', 'FAQ_UNPINNED',
      // FAQ promotion
      'FAQ_PROMOTED_FROM_OAQ',
      'FAQ_PROMOTED_FROM_GT',
      'FAQ_PROMOTED_FROM_CONTRIBUTION',
      // Cluster actions
      'OAQ_REJECTED', 'OAQ_MERGED', 'OAQ_SPLIT',
      // Golden Ticket
      'GT_RESOLVED', 'GT_REJECTED',
      // Personal Ticket
      'TICKET_RESOLVED', 'TICKET_REJECTED',
      'TICKET_BOOSTED', 'TICKET_BOOST_EXPIRED', 'TICKET_CONVERTED_TO_GOLDEN',
      'PIZZA_SLICE_SPENT',
      // Settings
      'SETTINGS_UPDATED',
    ],
  },

  targetType: {
    type: String,
    required: true,
    enum: ['User', 'FAQ', 'SemanticCluster', 'GoldenTicket', 'PersonalTicket', 'Settings', 'System'],
  },

  targetId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  targetLabel: { type: String, default: null },   // e.g. user email, FAQ question snippet

  reason:  { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'timestamp' } });

// Indexes for efficient query patterns used by the admin audit log viewer
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ adminType: 1, adminId: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Make the collection immutable — prevent any updates or deletes
auditLogSchema.pre('deleteOne', { document: true, query: false }, function () {
  throw new Error('AuditLog documents are immutable and cannot be deleted.');
});
auditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog documents are immutable and cannot be bulk deleted.');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);