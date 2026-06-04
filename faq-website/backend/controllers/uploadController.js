const path = require('path');
const fs = require('fs');
const Attachment = require('../models/Attachment');
const { LIMITS } = require('../utils/multer');

// ─── Video duration parser ────────────────────────────────────────────────────
function parseDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return null;
  return Math.round(seconds * 10) / 10; // 1 decimal place
}

// ─── POST /api/uploads ─────────────────────────────────────────────────────────
exports.uploadFiles = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const attachments = req.files.map((file, index) => {
      const durInput = Array.isArray(req.body[`duration_${file.fieldname}`]) 
        ? req.body[`duration_${file.fieldname}`][index] 
        : req.body[`duration_${file.fieldname}`];

      return {
        fileName:     file.originalname,
        fileUrl:      `/uploads/${file.filename}`,
        fileType:     file.mimetype,
        fileSize:     file.size,
        duration:     parseDuration(durInput),
        thumbnailUrl: Array.isArray(req.body[`thumbnail_${file.fieldname}`]) ? req.body[`thumbnail_${file.fieldname}`][index] : req.body[`thumbnail_${file.fieldname}`] || null,
        uploadedBy:   req.user.id,
      };
    });

    const saved = await Attachment.insertMany(attachments);

    res.json({
      success: true,
      attachments: saved.map(a => ({
        _id:         a._id,
        fileName:    a.fileName,
        fileUrl:     a.fileUrl,
        fileType:    a.fileType,
        fileSize:    a.fileSize,
        duration:    a.duration,
        thumbnailUrl:a.thumbnailUrl,
        uploadedBy:  a.uploadedBy,
        createdAt:   a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/uploads/:id ──────────────────────────────────────────────────
exports.deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) return res.status(404).json({ success: false, error: 'Not found' });

    // Only uploader or admin can delete
    if (attachment.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Delete physical file
    const filePath = path.resolve(__dirname, '../uploads', path.basename(attachment.fileUrl));
    try { fs.unlinkSync(filePath); } catch (e) { /* file may already be gone */ }

    await attachment.deleteOne();

    res.json({ success: true, message: 'Attachment deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/uploads/search ──────────────────────────────────────────────────
exports.searchAttachments = async (req, res, next) => {
  try {
    const { q, fileType, uploader, queryId, faqId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (q) {
      filter.$text = { $search: q };
    }
    if (fileType) {
      // fileType: 'document' | 'image' | 'video' | 'audio'
      const map = {
        document: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        image:    ['image/png', 'image/jpeg'],
        video:    ['video/mp4', 'video/quicktime', 'video/webm'],
        audio:    ['audio/mpeg', 'audio/wav', 'audio/mp4'],
      };
      const types = map[fileType.toLowerCase()];
      if (types) filter.fileType = { $in: types };
    }
    if (uploader) filter.uploadedBy = uploader;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [results, total] = await Promise.all([
      Attachment.find(filter)
        .populate('uploadedBy', '_id username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attachment.countDocuments(filter),
    ]);

    res.json({ success: true, results, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/uploads/analytics ───────────────────────────────────────────────
exports.getAnalytics = async (req, res, next) => {
  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total,
      todayCount,
      totalBytes,
      byType,
      recentFiles,
    ] = await Promise.all([
      Attachment.countDocuments(),
      Attachment.countDocuments({ createdAt: { $gte: startOfDay } }),
      Attachment.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]),
      Attachment.aggregate([
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ['$fileType', 'application/pdf'] }, then: 'PDF' },
                  { case: { $regexMatch: { input: '$fileType', regex: 'word' } }, then: 'DOCX' },
                  { case: { $regexMatch: { input: '$fileType', regex: '^image' } }, then: 'Image' },
                  { case: { $regexMatch: { input: '$fileType', regex: '^video' } }, then: 'Video' },
                  { case: { $regexMatch: { input: '$fileType', regex: '^audio' } }, then: 'Audio' },
                ],
                default: 'Other',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Attachment.find()
        .populate('uploadedBy', '_id username')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('fileName fileType fileSize createdAt uploadedBy')
        .lean(),
    ]);

    const mostUploadedType = byType[0]?._id || 'None';
    const docCount  = byType.find(t => ['PDF', 'DOCX'].includes(t._id))?.count || 0;
    const imgCount  = byType.find(t => t._id === 'Image')?.count || 0;
    const vidCount  = byType.find(t => t._id === 'Video')?.count || 0;
    const audCount  = byType.find(t => t._id === 'Audio')?.count || 0;

    res.json({
      success: true,
      analytics: {
        total,
        todayCount,
        totalBytes: totalBytes[0]?.total || 0,
        mostUploadedType,
        byType,
        recentFiles,
        documents: docCount,
        images:    imgCount,
        videos:    vidCount,
        audio:     audCount,
      },
    });
  } catch (err) {
    next(err);
  }
};