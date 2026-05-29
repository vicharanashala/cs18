const mongoose = require('mongoose');
const { Schema } = mongoose;

const RewardSchema = new Schema({
  userId: { type: String, required: true },
  pizzas: { type: Number, default: 0 },
  spurtiPoints: { type: Number, default: 0 }
});

module.exports = mongoose.model('Reward', RewardSchema);
