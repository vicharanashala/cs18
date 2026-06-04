const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { upload, handleMulterError } = require('../utils/multer');
const {
  uploadFiles,
  deleteAttachment,
  searchAttachments,
  getAnalytics,
} = require('../controllers/uploadController');

// POST /api/uploads  — upload up to 5 files
router.post('/',
  authMiddleware,
  upload.array('files', 5),
  handleMulterError,
  uploadFiles
);

// DELETE /api/uploads/:id
router.delete('/:id', authMiddleware, deleteAttachment);

// GET /api/uploads/search  (admin only)
router.get('/search', authMiddleware, adminMiddleware, searchAttachments);

// GET /api/uploads/analytics  (admin only)
router.get('/analytics', authMiddleware, adminMiddleware, getAnalytics);

module.exports = router;