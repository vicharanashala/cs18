const mongoose = require('mongoose');

const mentorCategorySchema = new mongoose.Schema({
  category:   { type: String, required: true, unique: true },
  mentorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  avgResolutionHours: { type: Number, default: 0 },
  openTickets: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MentorCategory', mentorCategorySchema);