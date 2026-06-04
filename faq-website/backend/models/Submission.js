const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster', required: true },
  question: { type: String, required: true },
  context: { type: String, required: true },
  category: { type: String },
  customCategory: { type: String },
  // Attachments supporting this query
  attachments: [{
    fileName:     { type: String, required: true },
    fileUrl:      { type: String, required: true },
    fileType:     { type: String, required: true },
    fileSize:     { type: Number, required: true },
    duration:     { type: Number, default: null },
    thumbnailUrl: { type: String, default: null },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);