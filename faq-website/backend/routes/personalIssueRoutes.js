const express = require('express');
const router = express.Router();
const personalIssueController = require('../controllers/personalIssueController');
const authMiddleware = require('../middleware/authMiddleware');
const banMiddleware = require('../middleware/banMiddleware');

router.post('/resolve', authMiddleware, banMiddleware, personalIssueController.resolvePersonalIssue);
router.post('/escalate', authMiddleware, banMiddleware, personalIssueController.escalatePersonalIssue);
router.post('/feedback', authMiddleware, banMiddleware, personalIssueController.feedbackPersonalIssue);
router.get('/:ticketId', authMiddleware, personalIssueController.getPersonalIssue);
router.post('/:ticketId/appeal', authMiddleware, banMiddleware, personalIssueController.appealPersonalIssue);

module.exports = router;
