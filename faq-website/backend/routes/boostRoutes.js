const express             = require('express');
const router              = express.Router();
const boostController     = require('../controllers/boostController');
const authMiddleware      = require('../middleware/authMiddleware');
const banMiddleware       = require('../middleware/banMiddleware');

/**
 * Boost feature
 * Cost: 1 Pizza Slice per boost, lasts 10 minutes
 *
 * POST /api/boost/cluster/:id   — boost an Once Asked Question
 * POST /api/boost/ticket/:id    — boost a personal ticket
 */
router.post('/cluster/:id',  authMiddleware, banMiddleware, boostController.boostCluster);
router.post('/ticket/:id',   authMiddleware, banMiddleware, boostController.boostTicket);

/**
 * Convert an existing personal ticket to a Golden Ticket.
 * Requires GT eligibility (no active GT, no cooldown).
 *
 * POST /api/boost/convert-to-golden/:ticketId
 * Body: { spurtiSpent: number }
 */
router.post('/convert-to-golden/:ticketId', authMiddleware, banMiddleware, boostController.convertToGoldenTicket);

module.exports = router;