require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('/Users/animeshpathak/faqiter1/faq-website/backend/models/FAQ');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const faqs = await FAQ.find().lean();
  console.log(faqs[0]);
  process.exit(0);
});
