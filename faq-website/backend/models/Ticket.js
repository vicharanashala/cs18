const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: String, required: true },
  category: { type: String, default: "General" },
  type: { type: String, enum: ["general", "personal"], default: "general" },
  status: { 
    type: String, 
    enum: ["submitted", "under_review", "assigned", "admin_review", "resolved"], 
    default: "submitted" 
  },
  escalated: { type: Boolean, default: false },
  assignedTo: { type: String, default: null }, // Could be admin name or ID
  assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  severity: { type: Number, default: 0, min: 0, max: 100 },
  autoRouted: { type: Boolean, default: false },
  routedAt: { type: Date, default: null },
  assignedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  routingReason: { type: String, default: '' },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // maps to Submission or PersonalTicket
  
  // Legacy fields (kept for backward compatibility if needed)
  embedding: [Number],
  clusterId: String,
  canonicalQuestion: String,
  submissionCount: { type: Number, default: 0 },
  createdBy: { type: String, default: "anonymous" },
}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);