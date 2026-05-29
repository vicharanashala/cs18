require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const ContributedFAQ = require('../models/ContributedFAQ');
const SemanticCluster = require('../models/SemanticCluster');
const { generateHashtags } = require('../utils/hashtagGenerator');

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Migrate FAQs
    const faqs = await FAQ.find();
    let faqCount = 0;
    for (const faq of faqs) {
      faq.hashtags = generateHashtags(faq.question, faq.category);
      await faq.save();
      faqCount++;
    }
    console.log(`Migrated ${faqCount} FAQs.`);

    // 2. Migrate ContributedFAQs
    const cFaqs = await ContributedFAQ.find();
    let cFaqCount = 0;
    for (const c of cFaqs) {
      const q = c.generatedQuestion || c.originalQuestion;
      c.hashtags = generateHashtags(q, c.category);
      await c.save();
      cFaqCount++;
    }
    console.log(`Migrated ${cFaqCount} ContributedFAQs.`);

    // 3. Migrate SemanticClusters
    const clusters = await SemanticCluster.find();
    let clusterCount = 0;
    for (const c of clusters) {
      const q = c.canonicalQuestion || c.originalQuestion;
      c.hashtags = generateHashtags(q, c.category);
      await c.save();
      clusterCount++;
    }
    console.log(`Migrated ${clusterCount} SemanticClusters.`);

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
