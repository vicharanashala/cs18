const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        // Ticket events
        'TICKET_ANSWERED',
        'TICKET_UNDER_REVIEW',
        'TICKET_ESCALATED',
        'TICKET_RESOLVED',
        'TICKET_REOPENED',
        'TICKET_MERGED',
        'TICKET_REDIRECTED',
        // Golden ticket events
        'GOLDEN_TICKET_REVIEWED',
        'GOLDEN_TICKET_APPROVED',
        'GOLDEN_TICKET_REJECTED',
        // Contribution events
        'CONTRIBUTION_ACCEPTED',
        'CONTRIBUTION_REJECTED',
        'CONTRIBUTION_UPVOTED',
        'CONTRIBUTION_FEATURED',
        // Account / Moderation
        'WARNING_ISSUED',
        'TEMP_BAN',
        'PERM_BAN',
        'MUTE_APPLIED',
        'SUSPENSION_LIFTED',
        'ROLE_CHANGED',
        // Rewards / Gamification
        'BADGE_EARNED',
        'MILESTONE_REACHED',
        'BOOST_ACTIVATED',
        'BOOST_EXPIRED',
        'GOLDEN_TICKET_CREATED',
        'REPUTATION_INCREASED',
        'TOP_CONTRIBUTOR',
        'QUERY_TRENDING',
        // Social / Engagement
        'USER_JOINED_QUERY',
        'QUERY_CLUSTERED',
        'ANSWER_MARKED_HELPFUL',
        'ADMIN_RESPONDED',
        'MENTION',
        // System events
        'MAINTENANCE_NOTICE',
        'FEATURE_RELEASE',
        'SECURITY_ALERT',
        'LOGIN_NEW_DEVICE',
        'DOWNTIME_NOTICE',
        // Admin broadcasts
        'BROADCAST_ALL',
        'BROADCAST_TARGETED',
      ],
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },

    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Flexible metadata — stores relevant IDs, slugs, context
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    actionUrl: {
      type: String,
      default: null,
    },

    // For admin broadcasts: optional expiry
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { sparse: true });

// Auto-expire broadcast notifications
notificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true }
);

module.exports = mongoose.model('Notification', notificationSchema);