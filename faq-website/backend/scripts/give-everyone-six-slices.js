/**
 * Give everyone 6 pizza slices (one full pizza).
 * Run: node scripts/give-everyone-six-slices.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');

async function run() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const result = await User.updateMany(
    {},
    { $set: { pizzaSlices: 6 } }
  );

  console.log(`✅ Updated ${result.modifiedCount} user(s) to 6 pizza slices.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});