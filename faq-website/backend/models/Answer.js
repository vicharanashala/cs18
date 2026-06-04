const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster', required: true },
  text: { type: String, required: true },
  userReputationAtTimeOfPost: { type: Number, default: 0 },
  helpfulVotes: { type: Number, default: 0 },
  helpfulVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Attachments for this reply
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

module.exports = mongoose.model('Answer', answerSchema);
