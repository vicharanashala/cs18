/**
 * Notification Service
 * Factory for creating and broadcasting all notification types.
 * Socket.IO is injected from server.js via setSocketIO().
 */

const Notification = require('../models/Notification');

// ── Socket.IO instance (injected from server.js) ──────────────────────────────
let _io = null;
exports.setSocketIO = (socketIO) => { _io = socketIO; };
const getIO = () => _io;

// ── Core factory ──────────────────────────────────────────────────────────────

/**
 * Create a notification, persist to DB, emit real-time event via Socket.IO.
 */
async function create({
  userId,
  type,
  title,
  message,
  metadata = {},
  priority = 'normal',
  actionUrl = null,
  expiresAt = null,
}) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata,
    priority,
    actionUrl,
    expiresAt,
  });

  const socketIO = getIO();
  if (socketIO && userId) {
    socketIO.to(`user:${userId}`).emit('notification:new', notification);
  }

  return notification;
}

// ── Admin broadcast helpers ───────────────────────────────────────────────────

/**
 * Broadcast a notification to ALL users.
 */
async function broadcastAll({ type, title, message, metadata = {}, priority = 'normal', actionUrl = null, expiresAt = null }) {
  const User = require('../models/User');
  const userIds = await User.distinct('_id');

  const docs = userIds.map((userId) => ({
    userId,
    type,
    title,
    message,
    metadata,
    priority,
    actionUrl,
    expiresAt,
  }));

  await Notification.insertMany(docs, { ordered: false });

  const socketIO = getIO();
  if (socketIO) {
    socketIO.emit('notification:broadcast', { type, title, message, priority });
  }

  return { count: userIds.length };
}

/**
 * Broadcast to a specific set of userIds.
 */
async function broadcastTo(userIds, params) {
  const docs = userIds.map((userId) => ({
    userId,
    ...params,
  }));

  await Notification.insertMany(docs, { ordered: false });

  const socketIO = getIO();
  if (socketIO) {
    userIds.forEach((userId) => {
      socketIO.to(`user:${userId}`).emit('notification:new', params);
    });
  }

  return { count: userIds.length };
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

async function getByUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const query = { userId };
  if (unreadOnly) query.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return { notifications, total, unreadCount, page, pages: Math.ceil(total / limit) };
}

async function markRead(notificationId, userId) {
  const n = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (n && _io) _io.to(`user:${userId}`).emit('notification:read', { notificationId });
  return n;
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  if (_io) _io.to(`user:${userId}`).emit('notification:read-all', {});
  return result;
}

async function deleteNotification(notificationId, userId) {
  return Notification.findOneAndDelete({ _id: notificationId, userId });
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

// ── Typed notification factory ────────────────────────────────────────────────

const NOTIF = {
  // ── Ticket events ──────────────────────────────────────────────────────────
  ticketAnswered: (userId, ticket, answerAuthor) =>
    create({
      userId,
      type: 'TICKET_ANSWERED',
      title: 'Your query has been answered!',
      message: `An admin just responded to "${(ticket.question || '').slice(0, 60)}".`,
      metadata: { ticketNumber: ticket.ticketNumber, answerAuthor },
      priority: 'high',
      actionUrl: `/tickets/${ticket.ticketNumber}`,
    }),

  ticketUnderReview: (userId, ticket) =>
    create({
      userId,
      type: 'TICKET_UNDER_REVIEW',
      title: 'Your query is being reviewed',
      message: `An admin has picked up "${(ticket.question || '').slice(0, 60)}" and will respond soon.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'normal',
      actionUrl: `/tickets/${ticket.ticketNumber}`,
    }),

  ticketEscalated: (userId, ticket) =>
    create({
      userId,
      type: 'TICKET_ESCALATED',
      title: 'Your query was escalated',
      message: `Your query has been escalated to a senior moderator.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'high',
      actionUrl: `/tickets/${ticket.ticketNumber}`,
    }),

  ticketResolved: (userId, ticket) =>
    create({
      userId,
      type: 'TICKET_RESOLVED',
      title: 'Your query has been resolved ✓',
      message: `Great news! Your query has been marked as resolved.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'normal',
      actionUrl: `/tickets/${ticket.ticketNumber}`,
    }),

  ticketReopened: (userId, ticket) =>
    create({
      userId,
      type: 'TICKET_REOPENED',
      title: 'Your query was reopened',
      message: `Your query has been reopened. Our team will take another look.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'high',
      actionUrl: `/tickets/${ticket.ticketNumber}`,
    }),

  ticketMerged: (userId, ticket, clusterId) =>
    create({
      userId,
      type: 'TICKET_MERGED',
      title: 'Your query was merged',
      message: `Your query has been grouped with similar questions. Check out the discussion!`,
      metadata: { ticketNumber: ticket.ticketNumber, clusterId },
      priority: 'normal',
      actionUrl: `/dashboard?tab=discussions&clusterId=${clusterId}`,
    }),

  ticketRedirected: (userId, ticket, clusterId) =>
    create({
      userId,
      type: 'TICKET_REDIRECTED',
      title: 'Your query has a match!',
      message: `Your question matches an existing discussion. You've been redirected to the canonical answer.`,
      metadata: { ticketNumber: ticket.ticketNumber, clusterId },
      priority: 'normal',
      actionUrl: `/dashboard?tab=discussions&clusterId=${clusterId}`,
    }),

  // ── Golden ticket events ───────────────────────────────────────────────────
  goldenTicketReviewed: (userId, ticket) =>
    create({
      userId,
      type: 'GOLDEN_TICKET_REVIEWED',
      title: 'Golden ticket update',
      message: `Your golden ticket for "${(ticket.question || '').slice(0, 50)}" has been reviewed.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'high',
      actionUrl: `/golden-tickets`,
    }),

  goldenTicketApproved: (userId, ticket) =>
    create({
      userId,
      type: 'GOLDEN_TICKET_APPROVED',
      title: '🎉 Golden Ticket Approved!',
      message: `Your golden ticket was accepted! Check your rewards.`,
      metadata: { ticketNumber: ticket.ticketNumber },
      priority: 'critical',
      actionUrl: `/golden-tickets`,
    }),

  goldenTicketRejected: (userId, ticket, reason) =>
    create({
      userId,
      type: 'GOLDEN_TICKET_REJECTED',
      title: 'Golden Ticket Not Approved',
      message: `Your golden ticket was not approved${reason ? `: ${reason}` : '.'}`,
      metadata: { ticketNumber: ticket.ticketNumber, reason },
      priority: 'high',
      actionUrl: `/golden-tickets`,
    }),

  // ── Contribution events ───────────────────────────────────────────────────
  contributionAccepted: (userId, faqId, pointsEarned) =>
    create({
      userId,
      type: 'CONTRIBUTION_ACCEPTED',
      title: `Contribution accepted! +${pointsEarned} pts`,
      message: `Your FAQ contribution was accepted and published. Keep up the great work!`,
      metadata: { faqId, pointsEarned },
      priority: 'normal',
      actionUrl: `/contribute`,
    }),

  contributionRejected: (userId, faqId, reason) =>
    create({
      userId,
      type: 'CONTRIBUTION_REJECTED',
      title: 'Contribution not accepted',
      message: `Your FAQ contribution was not approved${reason ? `: "${reason}"` : '.'}`,
      metadata: { faqId, reason },
      priority: 'normal',
      actionUrl: `/contribute`,
    }),

  contributionUpvoted: (userId, faqId) =>
    create({
      userId,
      type: 'CONTRIBUTION_UPVOTED',
      title: 'Your contribution got an upvote!',
      message: `Someone found your FAQ contribution helpful and upvoted it.`,
      metadata: { faqId },
      priority: 'low',
      actionUrl: `/contribute`,
    }),

  contributionFeatured: (userId, faqId) =>
    create({
      userId,
      type: 'CONTRIBUTION_FEATURED',
      title: '⭐ Your contribution was featured!',
      message: `Your FAQ was highlighted by an admin and is now featured on the homepage!`,
      metadata: { faqId },
      priority: 'high',
      actionUrl: `/contribute`,
    }),

  // ── Account / Moderation ──────────────────────────────────────────────────
  warningIssued: (userId, reason) =>
    create({
      userId,
      type: 'WARNING_ISSUED',
      title: '⚠️ Warning Issued',
      message: `A warning was issued on your account${reason ? `: "${reason}"` : '.'}`,
      metadata: { reason },
      priority: 'high',
      actionUrl: `/profile`,
    }),

  tempBan: (userId, expiresAt, reason) =>
    create({
      userId,
      type: 'TEMP_BAN',
      title: '⛔ Temporary Suspension',
      message: `Your account has been temporarily suspended until ${new Date(expiresAt).toLocaleDateString()}.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { expiresAt, reason },
      priority: 'critical',
      actionUrl: `/profile`,
      expiresAt,
    }),

  permBan: (userId, reason) =>
    create({
      userId,
      type: 'PERM_BAN',
      title: '⛔ Permanent Suspension',
      message: `Your account has been permanently suspended.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { reason },
      priority: 'critical',
      actionUrl: `/profile`,
    }),

  muteApplied: (userId, reason) =>
    create({
      userId,
      type: 'MUTE_APPLIED',
      title: '🔇 You have been muted',
      message: `You can no longer post or comment.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { reason },
      priority: 'high',
      actionUrl: `/profile`,
    }),

  suspensionLifted: (userId) =>
    create({
      userId,
      type: 'SUSPENSION_LIFTED',
      title: '✅ Suspension Lifted',
      message: `Your suspension has ended. Welcome back!`,
      priority: 'critical',
      actionUrl: `/dashboard`,
    }),

  roleChanged: (userId, newRole) =>
    create({
      userId,
      type: 'ROLE_CHANGED',
      title: `🎉 You are now a ${newRole}!`,
      message: `Your account role has been updated to ${newRole}. You now have additional permissions.`,
      metadata: { newRole },
      priority: 'high',
      actionUrl: `/profile`,
    }),

  // ── Rewards / Gamification ─────────────────────────────────────────────────
  badgeEarned: (userId, badgeName) =>
    create({
      userId,
      type: 'BADGE_EARNED',
      title: '🏅 Badge Earned!',
      message: `You earned the "${badgeName}" badge! Keep contributing to unlock more.`,
      metadata: { badgeName },
      priority: 'normal',
      actionUrl: `/rewards`,
    }),

  milestoneReached: (userId, milestone) =>
    create({
      userId,
      type: 'MILESTONE_REACHED',
      title: milestone.title || '🎯 Milestone Reached!',
      message: milestone.message || 'You have reached a new milestone!',
      metadata: { milestone },
      priority: 'high',
      actionUrl: `/rewards`,
    }),

  reputationIncreased: (userId, delta, total) =>
    create({
      userId,
      type: 'REPUTATION_INCREASED',
      title: `📈 +${delta} Reputation`,
      message: `Your reputation score is now ${total}. Great contributions pay off!`,
      metadata: { delta, total },
      priority: 'low',
      actionUrl: `/rewards`,
    }),

  topContributor: (userId, weekLabel) =>
    create({
      userId,
      type: 'TOP_CONTRIBUTOR',
      title: '🏆 Top Contributor!',
      message: `You were the top contributor this${weekLabel ? ' ' + weekLabel : ''}! Claim your bragging rights.`,
      metadata: { weekLabel },
      priority: 'high',
      actionUrl: `/rewards`,
    }),

  queryTrending: (userId, clusterId, viewCount) =>
    create({
      userId,
      type: 'QUERY_TRENDING',
      title: '📊 Your query is trending!',
      message: `Your question is getting lots of attention — ${viewCount} students have joined the discussion.`,
      metadata: { clusterId, viewCount },
      priority: 'normal',
      actionUrl: `/dashboard?tab=discussions&clusterId=${clusterId}`,
    }),

  // ── Social / Engagement ───────────────────────────────────────────────────
  userJoinedQuery: (userId, clusterId, joinerName) =>
    create({
      userId,
      type: 'USER_JOINED_QUERY',
      title: '👋 Someone joined your discussion',
      message: `${joinerName || 'A student'} just joined your question discussion.`,
      metadata: { clusterId, joinerName },
      priority: 'low',
      actionUrl: `/dashboard?tab=discussions&clusterId=${clusterId}`,
    }),

  queryClustered: (userId, ticket, clusterId) =>
    create({
      userId,
      type: 'QUERY_CLUSTERED',
      title: '🔗 Your query was clustered',
      message: `Your query has been grouped with similar questions for better answers.`,
      metadata: { ticketNumber: ticket?.ticketNumber, clusterId },
      priority: 'normal',
      actionUrl: `/dashboard?tab=discussions&clusterId=${clusterId}`,
    }),

  answerMarkedHelpful: (userId, answerId) =>
    create({
      userId,
      type: 'ANSWER_MARKED_HELPFUL',
      title: '👍 Your answer was marked helpful',
      message: `An admin marked your answer as helpful. Great work!`,
      metadata: { answerId },
      priority: 'low',
      actionUrl: `/contribute`,
    }),

  adminResponded: (userId, ticket) =>
    create({
      userId,
      type: 'ADMIN_RESPONDED',
      title: '💬 Admin responded to your query',
      message: `An admin has posted a response to your query.`,
      metadata: { ticketNumber: ticket?.ticketNumber },
      priority: 'high',
      actionUrl: `/tickets/${ticket?.ticketNumber}`,
    }),

  mention: (userId, mentionerName, context, actionUrl) =>
    create({
      userId,
      type: 'MENTION',
      title: `@${mentionerName} mentioned you`,
      message: context || 'You were mentioned in a discussion.',
      priority: 'normal',
      actionUrl: actionUrl || '/dashboard',
    }),

  // ── System events ──────────────────────────────────────────────────────────
  maintenanceNotice: (message) =>
    create({
      userId: null,
      type: 'MAINTENANCE_NOTICE',
      title: '🔧 Maintenance Notice',
      message: message || 'Scheduled maintenance is in progress. Some features may be temporarily unavailable.',
      priority: 'high',
      actionUrl: '/dashboard',
    }),

  featureRelease: (userId, featureName, description) =>
    create({
      userId,
      type: 'FEATURE_RELEASE',
      title: `✨ ${featureName || 'New Feature'} Released!`,
      message: description || 'A new feature has been released. Check it out!',
      priority: 'normal',
      actionUrl: '/dashboard',
    }),

  securityAlert: (userId, message) =>
    create({
      userId,
      type: 'SECURITY_ALERT',
      title: '🔐 Security Alert',
      message: message || 'A security event was detected on your account. Please review immediately.',
      priority: 'critical',
      actionUrl: '/profile',
    }),

  loginNewDevice: (userId, deviceInfo) =>
    create({
      userId,
      type: 'LOGIN_NEW_DEVICE',
      title: '🔐 New device login',
      message: `Your account was accessed from a new device${deviceInfo ? `: ${deviceInfo}` : ''}. If this wasn't you, secure your account.`,
      metadata: { deviceInfo },
      priority: 'high',
      actionUrl: '/profile',
    }),

  downtimeNotice: (userId, downtimeAt, duration) =>
    create({
      userId,
      type: 'DOWNTIME_NOTICE',
      title: '⏰ Scheduled Downtime',
      message: `The platform will be unavailable on ${new Date(downtimeAt).toLocaleString()}${duration ? ` for approximately ${duration}` : ''}.`,
      priority: 'high',
      actionUrl: '/dashboard',
      expiresAt: new Date(downtimeAt).getTime() > Date.now() ? new Date(downtimeAt) : null,
    }),
};

// ── Export everything ─────────────────────────────────────────────────────────
module.exports = {
  create,
  broadcastAll,
  broadcastTo,
  getByUser,
  markRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  ...NOTIF,
};