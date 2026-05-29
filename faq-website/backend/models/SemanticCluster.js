const mongoose = require('mongoose');

// Join method for a participant
const PARTICIPANT_METHOD_ENUM = ['MANUAL', 'AUTO_CLUSTERED'];

/** An individual user's variant question that was folded into this cluster. */
const relatedQuerySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question:    { type: String, required: true },   // the exact text the user typed
  joinedAt:    { type: Date, default: Date.now },
  joinMethod:  { type: String, enum: PARTICIPANT_METHOD_ENUM, default: 'MANUAL' },
}, { _id: true });

const semanticClusterSchema = new mongoose.Schema({
  // ── Core ─────────────────────────────────────────────────────────────────
  canonicalQuestion: { type: String, required: true },
  creatorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  context:    { type: String, required: true },

  // ── Variant questions that got merged into this cluster ──────────────────
  relatedQueries: { type: [relatedQuerySchema], default: [] },

  // ── Participants (people who joined / were auto-clustered) ───────────────
  participants: [{
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt:   { type: Date, default: Date.now },
    joinMethod: { type: String, enum: PARTICIPANT_METHOD_ENUM, default: 'MANUAL' },
    // If auto-clustered: copy of the question they typed that triggered the merge
    question:   { type: String, default: null },
  }],

  submissionsCount: { type: Number, default: 0 },   // legacy; use participants.length instead
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'ADMIN_REVIEW', 'PROMOTED', 'REJECTED'],
    default: 'OPEN'
  },

  // ── Urgency ──────────────────────────────────────────────────────────────
  isUrgent:   { type: Boolean, default: false, index: true },
  firstAnswerAt: { type: Date, default: null },
  answeredAt:    { type: Date, default: null },
  answerCount:   { type: Number, default: 0 },

  aiGeneratedAnswer: { type: String, default: null },

  // ── Categorisation ───────────────────────────────────────────────────────
  category:       { type: String },
  customCategory: { type: String },
  hashtags:       { type: [String], default: [] },

  // ── Admin tracking ───────────────────────────────────────────────────────
  ticketId:         { type: String, index: true },
  semanticQuestion: { type: String },
  rawQuestion:      { type: String },
  generatedTags:    { type: [String], default: [] },
  spWeight:         { type: Number, default: 0 },
  moderationNotes:  { type: String },
  resolvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Audit log ────────────────────────────────────────────────────────────
  history: [{
    event:    { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('SemanticCluster', semanticClusterSchema);