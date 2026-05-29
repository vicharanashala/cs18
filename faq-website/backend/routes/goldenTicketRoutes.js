const express = require('express');
const router = express.Router();
const goldenTicketController = require('../controllers/goldenTicketController');
const authMiddleware = require('../middleware/authMiddleware');
const banMiddleware = require('../middleware/banMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public/User Routes
router.get('/leaderboard', goldenTicketController.getLeaderboard);
router.post('/', authMiddleware, banMiddleware, goldenTicketController.createTicket);
router.delete('/:id', authMiddleware, goldenTicketController.deleteTicket);

// Admin Routes
router.get('/admin', authMiddleware, adminMiddleware, goldenTicketController.getAdminTickets);
router.post('/admin/:id/resolve', authMiddleware, adminMiddleware, goldenTicketController.resolveTicket);
router.post('/admin/:id/reject', authMiddleware, adminMiddleware, goldenTicketController.rejectTicket);

module.exports = router;
