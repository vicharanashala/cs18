const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/faqdb')
  .then(async () => {
    const User = require('./models/User');
    
    const user = await User.findOne({ email: 'testbanned@test.com' });
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    
    const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.updateOne({ bannedUntil });
    
    console.log(`✅ Banned ${user.email} until ${bannedUntil}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
