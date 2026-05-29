const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClusterSchema = new Schema({
  tickets: [{ type: Schema.Types.ObjectId, ref: 'Ticket' }],
  canonicalQuestion: { type: String },
  canonicalAnswer: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cluster', ClusterSchema);
