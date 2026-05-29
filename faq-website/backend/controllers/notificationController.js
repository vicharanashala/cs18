/**
 * Notification Controller
 * Handles all notification CRUD + admin broadcast endpoints.
 */

const notificationService = require('../services/notification.service');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ── GET /notifications ────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getByUser(req.user.id, { page, limit, unreadOnly });
    res.json(result);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[notifications] get error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// ── GET /notifications/unread-count ───────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// ── PATCH /notifications/:id/read ─────────────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const notification = await notificationService.markRead(req.params.id, req.user.id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// ── PATCH /notifications/read-all ─────────────────────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllRead(req.user.id);
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// ── DELETE /notifications/:id ─────────────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// ── DELETE /notifications/read ────────────────────────────────────────────────
exports.clearRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user.id, read: true });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
};

// ── Admin: Broadcast to all users ─────────────────────────────────────────────
exports.broadcastAll = async (req, res) => {
  try {
    const { type, title, message, priority, actionUrl } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message are required' });

    const result = await notificationService.broadcastAll({
      type: type || 'BROADCAST_ALL',
      title,
      message,
      priority: priority || 'normal',
      actionUrl: actionUrl || null,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
};

// ── Admin: Broadcast to specific users ───────────────────────────────────────
exports.broadcastTo = async (req, res) => {
  try {
    const { userIds, type, title, message, priority, actionUrl } = req.body;
    if (!userIds || !Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ error: 'userIds array is required' });
    }
    if (!title || !message) return res.status(400).json({ error: 'title and message are required' });

    const result = await notificationService.broadcastTo(userIds, {
      type: type || 'BROADCAST_TARGETED',
      title,
      message,
      priority: priority || 'normal',
      actionUrl: actionUrl || null,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send targeted notification' });
  }
};