const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const migrateSP = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { $or: [{ spurtiPoints: null }, { spurtiPoints: 0 }] },
      { $set: { spurtiPoints: 100 } }
    );

    console.log(`Migration complete. Modified ${result.modifiedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

migrateSP();
