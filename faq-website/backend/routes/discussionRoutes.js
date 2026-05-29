const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');
const authMiddleware = require('../middleware/authMiddleware');
const banMiddleware = require('../middleware/banMiddleware');

router.post('/submit', authMiddleware, banMiddleware, discussionController.submitTicket);
router.post('/clusters/:id/join', authMiddleware, banMiddleware, discussionController.joinCluster);
router.delete('/clusters/:id', authMiddleware, discussionController.deleteCluster);
router.get('/clusters', discussionController.getClusters);
router.get('/clusters/urgent', discussionController.getUrgentClusters);
router.get('/clusters/:id', authMiddleware, discussionController.getClusterById);

module.exports = router;
