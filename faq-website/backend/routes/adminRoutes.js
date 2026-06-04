const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminFaqController = require('../controllers/adminFaqController');
const systemSettingsController = require('../controllers/systemSettingsController');
const adminVoiceController = require('../controllers/adminVoiceController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me',                        authMiddleware, adminMiddleware, adminController.getCurrentAdmin);
router.get('/review-queue',               authMiddleware, adminMiddleware, adminController.getReviewQueue);
router.get('/categories', authMiddleware, adminMiddleware, adminController.getCategories);
router.post('/categories', authMiddleware, adminMiddleware, adminController.createCategory);
router.put('/categories/:id', authMiddleware, adminMiddleware, adminController.updateCategory);
router.delete('/categories/:id', authMiddleware, adminMiddleware, adminController.deleteCategory);
router.get('/categories/stats', authMiddleware, adminMiddleware, adminController.getCategoryStats);
router.post('/promote-faq', authMiddleware, adminMiddleware, adminController.promoteToFaq);
router.post('/faqs/promote-knowledge', authMiddleware, adminMiddleware, adminFaqController.promoteKnowledge);
router.post('/reject-faq', authMiddleware, adminMiddleware, adminController.rejectCluster);
router.get('/personal-tickets', authMiddleware, adminMiddleware, adminController.getPersonalTickets);
router.post('/personal-tickets/resolve', authMiddleware, adminMiddleware, adminController.resolvePersonalTicket);

// ─── Deduplication Admin Tools ────────────────────────────────────────────────
router.get('/duplicates',       authMiddleware, adminMiddleware, adminController.getDuplicateSuggestions);
router.post('/merge-duplicate', authMiddleware, adminMiddleware, adminController.applyMerge);
router.post('/run-deduplication', authMiddleware, adminMiddleware, adminController.runDeduplication);
router.post('/split-cluster',   authMiddleware, adminMiddleware, adminController.splitCluster);

// ─── Voice AI Analytics ─────────────────────────────────────────────────────────
router.get('/voice/stats', authMiddleware, adminMiddleware, adminVoiceController.getStats);
router.get('/voice/config', authMiddleware, adminMiddleware, adminVoiceController.getConfig);
router.put('/voice/config', authMiddleware, adminMiddleware, adminVoiceController.updateConfig);

// ─── System Settings ───────────────────────────────────────────────────────────
router.get('/settings',                  authMiddleware, adminMiddleware, systemSettingsController.getSettings);
router.patch('/settings/pizza',          authMiddleware, adminMiddleware, systemSettingsController.updatePizzaSettings);
router.post('/settings/pizza/apply-migration', authMiddleware, adminMiddleware, systemSettingsController.applyPizzaMigration);
// ─── FAQ Knowledge Base Management ───────────────────────────────────────────
router.get('/faqs',              authMiddleware, adminMiddleware, adminFaqController.getFaqs);
router.get('/faqs/:id',          authMiddleware, adminMiddleware, adminFaqController.getFaq);
router.post('/faqs',             authMiddleware, adminMiddleware, adminFaqController.createFaq);
router.put('/faqs/:id',          authMiddleware, adminMiddleware, adminFaqController.updateFaq);
router.patch('/faqs/:id/archive', authMiddleware, adminMiddleware, adminFaqController.archiveFaq);
router.patch('/faqs/:id/restore', authMiddleware, adminMiddleware, adminFaqController.restoreFaq);
router.patch('/faqs/:id/pin',    authMiddleware, adminMiddleware, adminFaqController.pinFaq);
router.patch('/faqs/:id/unpin',  authMiddleware, adminMiddleware, adminFaqController.unpinFaq);
router.patch('/faqs/:id/feature', authMiddleware, adminMiddleware, adminFaqController.featureFaq);
router.patch('/faqs/:id/unfeature', authMiddleware, adminMiddleware, adminFaqController.unfeatureFaq);
router.delete('/faqs/:id',       authMiddleware, adminMiddleware, adminFaqController.deleteFaq);
router.patch('/faqs/bulk',       authMiddleware, adminMiddleware, adminFaqController.bulkAction);

// ─── List sources for Promotion modal ─────────────────────────────────────────
router.get('/golden-tickets/active', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tickets = await require('../models/GoldenTicket')
      .find({ status: 'active', knowledgeCaptured: { $ne: true } })
      .populate('createdBy', 'email')
      .sort({ spurtiSpent: -1 })
      .lean();
    res.json({ success: true, tickets });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/contributions/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const contribs = await require('../models/ContributedFAQ')
      .find({ status: 'pending' })
      .populate('contributedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, contributions: contribs });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/settings/public-faq',     authMiddleware, adminMiddleware, systemSettingsController.updatePublicFAQSettings);
router.patch('/settings/bee',            authMiddleware, adminMiddleware, systemSettingsController.updateBeeSettings);

// User management (admin only)
router.get('/users',                           authMiddleware, adminMiddleware, adminController.getUsers);
router.get('/user-management/stats',        authMiddleware, adminMiddleware, adminController.getUserManagementStats);
router.get('/users/:userId',                   authMiddleware, adminMiddleware, adminController.getUserById);
router.patch('/users/:userId/pizza',           authMiddleware, adminMiddleware.requireCanModerate, adminController.adjustUserPizza);
router.post('/users/:userId/pizza/grant',      authMiddleware, adminMiddleware.requireCanModerate, adminController.quickGrantPizza);
router.patch('/users/:userId/spurti',          authMiddleware, adminMiddleware.requireCanModerate, adminController.adjustUserSpurti);
router.post('/users/:userId/ban',              authMiddleware, adminMiddleware.requireCanModerate, adminController.toggleBan);
router.post('/users/:userId/suspend',          authMiddleware, adminMiddleware.requireCanModerate, adminController.suspendUser);
router.get('/users/:userId/stats',             authMiddleware, adminMiddleware, adminController.getUserStats);
router.get('/users/:userId/history',           authMiddleware, adminMiddleware, adminController.getUserHistory);
router.get('/audit-log',                       authMiddleware, adminMiddleware, adminController.getAuditLog);
router.get('/analytics/dashboard',               authMiddleware, adminMiddleware, adminController.getAdminAnalytics);

module.exports = router;