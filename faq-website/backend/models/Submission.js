const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SemanticCluster', required: true },
  question: { type: String, required: true },
  context: { type: String, required: true },
  category: { type: String },
  customCategory: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);