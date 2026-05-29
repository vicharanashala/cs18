const mongoose = require('mongoose');
require('dotenv').config();
const SemanticCluster = require('./models/SemanticCluster');
const generateCanonicalTitle = require('./utils/generateCanonicalTitle');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for Migration");

    const clusters = await SemanticCluster.find({});
    console.log(`Found ${clusters.length} clusters to process.`);

    let updatedCount = 0;

    for (const cluster of clusters) {
      if (!cluster.originalQuestion) {
        console.log(`Processing cluster: ${cluster._id}`);
        // Save current title as original question
        cluster.originalQuestion = cluster.canonicalQuestion;
        
        // Generate new canonical title using Groq
        console.log(`- Generating canonical title for: "${cluster.originalQuestion.substring(0, 30)}..."`);
        const newTitle = await generateCanonicalTitle(cluster.originalQuestion, cluster.context);
        
        console.log(`- New Title: "${newTitle}"`);
        cluster.canonicalQuestion = newTitle;
        
        await cluster.save();
        updatedCount++;
        
        // Rate limit mitigation for Groq
        await delay(1000); 
      } else {
        console.log(`Skipping cluster ${cluster._id}, already has originalQuestion.`);
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} clusters.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
