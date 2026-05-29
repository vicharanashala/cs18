const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const SemanticCluster = require('../models/SemanticCluster');
const { extractKeywords, sanitizeTags } = require('../utils/generateCanonicalTitle');

async function runBackfill() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB');
    }

    const clusters = await SemanticCluster.find({
      $or: [
        { hashtags: { $exists: false } },
        { hashtags: { $size: 0 } },
        { hashtags: null }
      ]
    });

    console.log(`Found ${clusters.length} clusters missing hashtags.`);

    let updatedCount = 0;
    for (const cluster of clusters) {
      const combinedText = `${cluster.originalQuestion || cluster.canonicalQuestion} ${cluster.context || ''}`;
      const rawTags = extractKeywords(combinedText);
      const cleanTags = sanitizeTags(rawTags);

      if (cleanTags.length > 0) {
        cluster.hashtags = cleanTags;
        await cluster.save();
        updatedCount++;
        console.log(`Updated cluster ${cluster._id} with tags: [${cleanTags.join(', ')}]`);
      }
    }

    console.log(`Backfill complete. Updated ${updatedCount} clusters.`);
  } catch (err) {
    console.error('Error during backfill:', err);
  } finally {
    if (require.main === module && mongoose.connection.readyState === 1) {
      mongoose.disconnect();
    }
  }
}

// Allow running from CLI directly
if (require.main === module) {
  runBackfill();
}

module.exports = runBackfill;
