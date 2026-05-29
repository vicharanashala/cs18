const mongoose = require('mongoose');

const contributedFAQSchema = new mongoose.Schema({
  // Raw user input
  originalQuestion: { type: String, required: true },
  originalAnswer:   { type: String, required: true },
  
  // AI-generalized output
  generatedQuestion: { type: String },
  generatedAnswer:   { type: String },
  
  // Metadata
  category:      { type: String, required: true },
  customCategory:{ type: String },
  hashtags:      { type: [String], default: [] },
  contributedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sourceType:    { type: String, default: 'community' },
  
  // Status: pending | approved | rejected
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('ContributedFAQ', contributedFAQSchema);
