const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster', required: true },
  text: { type: String, required: true },
  userReputationAtTimeOfPost: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Answer', answerSchema);
