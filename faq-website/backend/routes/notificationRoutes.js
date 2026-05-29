const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const nc = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authMiddleware);

// User routes
router.get('/', nc.getNotifications);
router.get('/unread-count', nc.getUnreadCount);
router.patch('/:id/read', nc.markRead);
router.patch('/read-all', nc.markAllRead);
router.delete('/:id', nc.deleteNotification);
router.delete('/read/clear', nc.clearRead);

// Admin broadcast routes
router.post('/broadcast-all', nc.broadcastAll);
router.post('/broadcast-to', nc.broadcastTo);

module.exports = router;