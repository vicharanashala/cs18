const express = require('express');
const router = express.Router();
const beeController = require('../controllers/beeController');

// POST /api/bee/chat
router.post('/chat', beeController.chat);

module.exports = router;
