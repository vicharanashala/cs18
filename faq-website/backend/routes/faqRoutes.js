const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { contribute, getContributions } = require('../controllers/faqContributeController');
const { FAQ_CATEGORIES } = require('../utils/constants');

const faqController = require('../controllers/faqController');

// Get all FAQs (potentially grouped by category on the frontend)
router.get('/', faqController.getFaqs);

// POST view session details (read time)
router.post('/:id/view-session', faqController.trackViewSession);

// POST feedback for an FAQ
router.post('/:id/feedback', faqController.submitFeedback);

// Get all categories
router.get('/categories', async (req, res, next) => {
  try {
    res.json({ success: true, categories: FAQ_CATEGORIES.map(name => ({ name })) });
  } catch (err) {
    next(err);
  }
});

// Community FAQ contribution (any logged-in user)
router.post('/contribute', authMiddleware, contribute);

// Admin: view all contributed FAQs
router.get('/contributed', authMiddleware, adminMiddleware, getContributions);

module.exports = router;