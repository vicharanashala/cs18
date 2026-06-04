const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/chat
// We don't require auth here if we want the public to use it, but can add if needed.
router.post('/chat', aiController.chat);

module.exports = router;
