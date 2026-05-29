const express = require('express');
const router = express.Router();
const answerController = require('../controllers/answerController');
const authMiddleware = require('../middleware/authMiddleware');
const banMiddleware = require('../middleware/banMiddleware');

router.post('/submit', authMiddleware, banMiddleware, answerController.submitAnswer);
router.delete('/:id', authMiddleware, answerController.deleteAnswer);

module.exports = router;
