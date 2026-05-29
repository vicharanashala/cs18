const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/balance', authMiddleware, walletController.getBalance);
router.get('/history', authMiddleware, walletController.getHistory);
router.post('/redeem-pizza', authMiddleware, walletController.redeemPizza);

module.exports = router;
