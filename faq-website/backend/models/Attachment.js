const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  // Original filename as uploaded
  fileName: { type: String, required: true },
  // Public URL (served statically)
  fileUrl:  { type: String, required: true },
  // MIME type
  fileType: { type: String, required: true },
  // Bytes
  fileSize: { type: Number, required: true },
  // Video/audio duration in seconds (optional)
  duration: { type: Number, default: null },
  // Video thumbnail URL (optional)
  thumbnailUrl: { type: String, default: null },
  // Uploader
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Index for search
attachmentSchema.index({ fileName: 'text' });
attachmentSchema.index({ uploadedBy: 1 });
attachmentSchema.index({ fileType: 1 });
attachmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);