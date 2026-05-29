const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function migrateAuth() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for Auth Migration');

    const users = await User.find({});
    let modifiedCount = 0;

    for (const user of users) {
      let changed = false;

      // Fix unhashed passwords
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`Hashing plaintext password for user: ${user.email}`);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        changed = true;
      }

      // Normalize roles
      if (user.role !== 'admin' && user.role !== 'student') {
        user.role = 'student';
        changed = true;
      }

      if (changed) {
        // use updateOne to prevent pre('save') from re-hashing
        await User.updateOne(
          { _id: user._id },
          { $set: { password: user.password, role: user.role } }
        );
        modifiedCount++;
      }
    }

    console.log(`✅ Auth Migration Complete. Modified ${modifiedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateAuth();
