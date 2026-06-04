const mongoose = require('mongoose');

const personalTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  context: { type: String, required: true },
  category: { type: String, required: true },
  customCategory: { type: String },
  tags: { type: [String], default: [] },
  institution: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'submitted', 'under_review', 'assigned_to_peer', 'admin_review', 'resolved', 'rejected'], default: 'submitted' },
  attachments: [{
    fileName:     { type: String, required: true },
    fileUrl:      { type: String, required: true },
    fileType:     { type: String, required: true },
    fileSize:     { type: Number, required: true },
    duration:     { type: Number, default: null },
    thumbnailUrl: { type: String, default: null },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  normalizedIntent: { type: String }, // Semantic cleaned question
  resolvedAnswer: { type: String },
  quirks: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priorityScore: { type: Number, default: 0, index: true },
  severityScore: { type: Number, default: 0, index: true },
  priorityLevel: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'URGENT', 'CRITICAL'], default: 'LOW', index: true },
  severityBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  autoRouted: { type: Boolean, default: false },
  routedAt: { type: Date, default: null },

  // Standardized tracking fields for Admin Console
  ticketId: { type: String, index: true },
  semanticQuestion: { type: String }, // Cleaned/canonical question
  rawQuestion: { type: String }, // Backup of raw if needed
  generatedTags: { type: [String], default: [] },
  spWeight: { type: Number, default: 0 },
  moderationNotes: { type: String },

  // ── Boost ─────────────────────────────────────────────────────────────────
  boostedAt:    { type: Date,   default: null, index: true },
  boostedUntil: { type: Date,   default: null, index: true },

  // ── Golden Ticket conversion ──────────────────────────────────────────────
  isConvertedToGT: { type: Boolean, default: false },
  goldenTicketId:  { type: mongoose.Schema.Types.ObjectId, ref: 'GoldenTicket', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PersonalTicket', personalTicketSchema);
