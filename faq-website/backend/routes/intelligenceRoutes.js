const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Dashboard aggregation endpoints (Admin only)
router.get('/heatmap', authMiddleware, adminMiddleware, intelligenceController.getQuestionHeatmap);
router.get('/friction-zones', authMiddleware, adminMiddleware, intelligenceController.getFrictionZones);
router.get('/escalations', authMiddleware, adminMiddleware, intelligenceController.getEscalationHotspots);
router.get('/dead-faqs', authMiddleware, adminMiddleware, intelligenceController.getDeadFaqs);
router.get('/deflections', authMiddleware, adminMiddleware, intelligenceController.getDeflectionStats);

// Revalidate FAQ endpoint
router.post('/revalidate-faq/:id', authMiddleware, adminMiddleware, intelligenceController.revalidateFaq);

module.exports = router;
