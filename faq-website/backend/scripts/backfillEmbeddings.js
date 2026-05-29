/**
 * backfillEmbeddings.js
 * Generates vector embeddings for all existing FAQs that lack one.
 * Run: node scripts/backfillEmbeddings.js
 *
 * Uses Jina AI embeddings (jina-embeddings-v2-base-en).
 * Processes in batches to avoid rate-limiting.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const FAQ = require('../models/FAQ');
const ContributedFAQ = require('../models/ContributedFAQ');
const getEmbedding = require('../utils/embedding');

const BATCH_SIZE = 20;
const EMBEDDING_MODEL = 'jina-embeddings-v2-base-en';

async function backfill(model, label, filter = {}) {
  const all = await model.find({ ...filter }).select('_id question answer embedding');
  const toEmbed = all.filter(doc => !doc.embedding || doc.embedding.length === 0);

  console.log(`[${label}] ${toEmbed.length} / ${all.length} need embedding`);

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    console.log(`  Processing ${i + 1}–${Math.min(i + BATCH_SIZE, toEmbed.length)}...`);

    await Promise.all(batch.map(async (doc) => {
      try {
        const text = `${doc.question || ''} ${doc.answer || ''}`.trim();
        if (!text) return;

        const emb = await getEmbedding(text);
        if (emb && emb.length > 0) {
          doc.embedding = emb;
          await doc.save();
          console.log(`  ✓ ${doc._id} (${text.slice(0, 40)}...)`);
        }
      } catch (err) {
        console.error(`  ✗ ${doc._id}: ${err.message}`);
      }

      // Rate-limit delay between batches
      if ((i + BATCH_SIZE) % (BATCH_SIZE * 3) === 0) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }));
  }

  console.log(`[${label}] Done.\n`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB.\n');

  await backfill(FAQ, 'FAQ');
  await backfill(ContributedFAQ, 'ContributedFAQ', { status: 'approved' });

  console.log('All embeddings backfilled.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});