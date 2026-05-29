require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI environment variable is missing.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const User = require('./models/User');
    const user = await User.findOne({ email: 'bannedtest@faq.test' });
    if (!user) { console.log('User not found'); process.exit(0); }
    const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.updateOne({ bannedUntil });
    console.log(`✅ Banned ${user.email} until ${bannedUntil}`);
    process.exit(0);
  })
  .catch(err => { console.error(err.message); process.exit(1); });