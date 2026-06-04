const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = {
  // Documents
  'application/pdf':                              '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  // Images
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  // Videos
  'video/mp4':  '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  // Audio
  'audio/mpeg': '.mp3',
  'audio/wav':  '.wav',
  'audio/mp4':  '.m4a',
};

// ── Size limits ───────────────────────────────────────────────────────────────
const LIMITS = {
  FILE_SIZE: {
    documents: 10 * 1024 * 1024,  // 10 MB
    images:    Infinity,            // no limit specified
    videos:    25 * 1024 * 1024,   // 25 MB
    audio:     10 * 1024 * 1024,   // 10 MB
  },
  MAX_FILES: 5,
  MAX_VIDEOS: 2,
};

// ── Storage ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const rawName = path.parse(file.originalname).name;         // no extension
    const ext     = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
    // Sanitize: keep only alphanumeric, dash, underscore
    const safeName = rawName.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 64);
    const unique   = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    cb(null, `${safeName}_${unique}${ext}`);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────
function fileFilter(req, file, cb) {
  // 1. MIME type must be in ALLOWED_TYPES
  if (!ALLOWED_TYPES[file.mimetype]) {
    return cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }

  // 2. Extension must not be executable
  const forbiddenExts = [
    '.exe', '.bat', '.sh', '.js', '.apk', '.dmg', '.msi', '.app',
    '.cmd', '.com', '.pif', '.scr', '.vbs', '.ws', '.wsh', '.scr',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (forbiddenExts.includes(ext)) {
    return cb(new Error('Executable files are not allowed.'), false);
  }

  // 3. Per-field file-count / video-count check (stored in req._uploadMeta)
  req._uploadMeta = req._uploadMeta || { total: 0, videos: 0 };

  if (req._uploadMeta.total >= LIMITS.MAX_FILES) {
    return cb(new Error(`Maximum ${LIMITS.MAX_FILES} files allowed per submission.`), false);
  }

  const isVideo = ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype);
  if (isVideo && req._uploadMeta.videos >= LIMITS.MAX_VIDEOS) {
    return cb(new Error(`Maximum ${LIMITS.MAX_VIDEOS} videos allowed per submission.`), false);
  }

  // 4. Size limit by category
  let maxSize;
  if (['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) {
    maxSize = LIMITS.FILE_SIZE.documents;
  } else if (['image/png', 'image/jpeg'].includes(file.mimetype)) {
    maxSize = LIMITS.FILE_SIZE.images;
  } else if (isVideo) {
    maxSize = LIMITS.FILE_SIZE.videos;
  } else if (['audio/mpeg', 'audio/wav', 'audio/mp4'].includes(file.mimetype)) {
    maxSize = LIMITS.FILE_SIZE.audio;
  } else {
    maxSize = 10 * 1024 * 1024;
  }

  if (file.size > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    return cb(new Error(`File exceeds maximum size of ${mb} MB: ${file.originalname}`), false);
  }

  req._uploadMeta.total++;
  if (isVideo) req._uploadMeta.videos++;

  cb(null, true);
}

// ── Error handler wrapper ─────────────────────────────────────────────────────
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'Too many files.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // global cap (25 MB); per-type enforced above
  },
});

module.exports = { upload, handleMulterError, LIMITS, ALLOWED_TYPES };