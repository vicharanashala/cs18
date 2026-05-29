require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const faqs = await FAQ.find();
  let missing = 0;
  for (const f of faqs) {
    if (!f.embedding || f.embedding.length === 0) {
      missing++;
    }
  }
  console.log(`Missing embeddings: ${missing}/${faqs.length}`);
  mongoose.disconnect();
}
check();
