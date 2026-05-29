const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/review-queue', authMiddleware, adminMiddleware, adminController.getReviewQueue);
router.get('/categories', authMiddleware, adminMiddleware, adminController.getCategories);
router.post('/categories', authMiddleware, adminMiddleware, adminController.createCategory);
router.post('/promote-faq', authMiddleware, adminMiddleware, adminController.promoteToFaq);
router.post('/reject-faq', authMiddleware, adminMiddleware, adminController.rejectCluster);
router.get('/personal-tickets', authMiddleware, adminMiddleware, adminController.getPersonalTickets);
router.post('/personal-tickets/resolve', authMiddleware, adminMiddleware, adminController.resolvePersonalTicket);

// ─── Deduplication Admin Tools ────────────────────────────────────────────────
router.get('/duplicates',       authMiddleware, adminMiddleware, adminController.getDuplicateSuggestions);
router.post('/merge-duplicate', authMiddleware, adminMiddleware, adminController.applyMerge);
router.post('/run-deduplication', authMiddleware, adminMiddleware, adminController.runDeduplication);
router.post('/split-cluster',   authMiddleware, adminMiddleware, adminController.splitCluster);

module.exports = router;