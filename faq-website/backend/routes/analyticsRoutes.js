const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Protected admin-only dashboard route
router.get('/dashboard', authMiddleware, adminMiddleware, analyticsController.getDashboardData);

module.exports = router;
