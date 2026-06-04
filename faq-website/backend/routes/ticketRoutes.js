const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, ticketController.createTicket);
router.get('/track/:ticketNumber', authMiddleware, ticketController.trackTicket);
router.get('/my', authMiddleware, ticketController.getUserTickets);
router.post('/:ticketId/accept', authMiddleware, ticketController.acceptTicket);
router.delete('/:ticketNumber', authMiddleware, ticketController.deleteTicket);

module.exports = router;