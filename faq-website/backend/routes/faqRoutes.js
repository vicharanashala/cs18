const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { contribute, getContributions } = require('../controllers/faqContributeController');
const Category = require('../models/Category');

const faqController = require('../controllers/faqController');

// Get all FAQs (potentially grouped by category on the frontend)
router.get('/', faqController.getFaqs);

// Get all categories derived directly from published FAQs
router.get('/categories', async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { needsReview: false, isArchived: { $ne: true } } },
      { $group: {
          _id: "$category",
          count: { $sum: 1 },
          recentFaq: { $first: "$$ROOT" }
      }},
      { $sort: { count: -1 } },
      { $project: {
          _id: 0,
          name: "$_id",
          count: 1,
          recent: {
            _id: "$recentFaq._id",
            question: "$recentFaq.question",
            canonicalQuestion: "$recentFaq.canonicalQuestion",
            title: "$recentFaq.title",
            createdAt: "$recentFaq.createdAt"
          }
      }}
    ];
    
    const categories = await FAQ.aggregate(pipeline);
    
    // Normalize missing names and ensure "General" exists if null
    const mapped = categories.map(c => ({
      name: c.name || "General",
      count: c.count,
      recent: c.recent
    }));
    
    res.json({ success: true, categories: mapped });
  } catch (err) {
    next(err);
  }
});

// Get a single published FAQ by ID (public — no auth required)
router.get('/:id', faqController.getFaqById);

// POST view session details (read time)
router.post('/:id/view-session', faqController.trackViewSession);

// POST feedback for an FAQ
router.post('/:id/feedback', faqController.submitFeedback);

// Community FAQ contribution (any logged-in user)
router.post('/contribute', authMiddleware, contribute);

// Admin: view all contributed FAQs
router.get('/contributed', authMiddleware, adminMiddleware, getContributions);

module.exports = router;