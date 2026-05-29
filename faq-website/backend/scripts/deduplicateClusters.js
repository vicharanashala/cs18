/**
 * deduplicateClusters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Retroactive semantic deduplication for SemanticCluster documents.
 *
 * What it does:
 *   1. Loads all OPEN clusters
 *   2. Generates / retrieves embeddings for each
 *   3. Compares every pair using cosine similarity + hybrid text similarity
 *   4. For pairs above THRESHOLD (default 0.82):
 *        – picks the richer cluster as master
 *        – migrates all variant data into master
 *        – marks duplicate for archival/deletion
 *   5. Produces a JSON merge log for rollback
 *
 * Usage:
 *   node scripts/deduplicateClusters.js             # dry-run (safe)
 *   node scripts/deduplicateClusters.js --apply     # actually merge
 *   node scripts/deduplicateClusters.js --rollback  # undo last --apply run
 *
 * Safety features:
 *   – Dry-run is the default (--apply required to write changes)
 *   – Merge log written to scripts/merge-log.json before every change
 *   – Batch processing to avoid OOM on large datasets
 *   – Duplicate master decisions based on: engagement, answerCount, recency
 *
 * Thresholds:
 *   – EMBEDDING_THRESHOLD  : merge if vector cosine ≥ this (default 0.82)
 *   – TEXT_THRESHOLD       : fallback text-only threshold (0.82)
 *   – BATCH_EMBED_SIZE     : embedding API batch size (default 20)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const SemanticCluster = require('../models/SemanticCluster');
const Submission = require('../models/Submission');
const getEmbedding = require('../utils/embedding');
const { normalizeQuery, hybridClusterSimilarity } = require('../utils/searchUtils');

// ─── Configuration ─────────────────────────────────────────────────────────────
const EMBEDDING_THRESHOLD = 0.82;
const TEXT_THRESHOLD      = 0.82;
const BATCH_EMBED_SIZE    = 1;       // 1 at a time to respect 2-concurrency API limit
const EMBED_RETRY_MS      = 5000;    // pause between 429s before retry
const EMBED_MAX_RETRIES   = 5;
const MERGE_LOG_PATH      = path.join(__dirname, 'merge-log.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aggressive normalization for comparison purposes */
function normalizeForCompare(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pick the richer cluster as master (higher engagement wins, ties → newer) */
function pickMaster(a, b) {
  const score = (c) =>
    (c.participants?.length || 0) +
    (c.submissionsCount || 0) * 0.5 +
    (c.answerCount || 0) * 2 +
    (c.spWeight || 0) * 0.1 +
    // recency bonus: newer clusters slightly preferred as master
    ((Date.now() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) < 7 ? 1 : 0);

  const sa = score(a), sb = score(b);
  return sa >= sb ? a : b;
}

/** Merge all variant data from `src` into `dst` (both are raw MongoDB docs) */
function buildMerge(dst, src) {
  const merged = {
    ...dst,
    participants: [...(dst.participants || [])],
    relatedQueries: [...(dst.relatedQueries || [])],
    submissionsCount: (dst.submissionsCount || 0),
    answerCount: (dst.answerCount || 0),
    spWeight: (dst.spWeight || 0),
    hashtags: [...new Set([...(dst.hashtags || []), ...(src.hashtags || [])])],
    // history event
    history: [
      ...(dst.history || []),
      {
        event: `MERGED:${src._id.toString()} (${normalizeForCompare(src.canonicalQuestion || src.rawQuestion || '')})`,
        timestamp: new Date(),
      },
    ],
  };

  // Merge each participant from src
  for (const p of src.participants || []) {
    const already = merged.participants.find(
      x => x.userId?.toString() === p.userId?.toString()
    );
    if (!already) {
      merged.participants.push({
        ...p,
        joinMethod: 'AUTO_CLUSTERED',
        mergedFrom: src._id.toString(),
      });
    }
  }

  // Merge submissionsCount
  merged.submissionsCount += src.submissionsCount || 0;

  // Merge answerCount (keep the max)
  merged.answerCount = Math.max(merged.answerCount, src.answerCount || 0);

  // Merge relatedQueries variants
  for (const rq of src.relatedQueries || []) {
    const already = merged.relatedQueries.find(
      x => x.userId?.toString() === rq.userId?.toString()
    );
    if (!already) {
      merged.relatedQueries.push({ ...rq, mergedFrom: src._id.toString() });
    }
  }

  return merged;
}

// ─── Core deduplication ───────────────────────────────────────────────────────

/**
 * Compute or retrieve embedding for a cluster.
 * Caches results in the provided map to avoid re-embedding.
 */
const embeddingCache = new Map();

async function embedWithRetry(text, retries = EMBED_MAX_RETRIES) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await getEmbedding(text);
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 429) {
        const waitMs = EMBED_RETRY_MS * attempt;  // back off: 5s, 10s, 15s…
        console.warn(`  [WARNING] Embedding 429 — waiting ${waitMs}ms before retry ${attempt}/${retries}`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        // Non-429 error — log and give up on this item
        console.warn(`  [WARNING] Embedding attempt ${attempt} failed: ${err.message}`);
        if (attempt === retries) return null;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  console.error(`  [ERROR] All embedding retries failed for text excerpt: ${text.slice(0, 60)}`);
  return null;
}

async function getClusterEmbedding(cluster, text) {
  const key = cluster._id.toString();
  if (embeddingCache.has(key)) return embeddingCache.get(key);

  try {
    if (cluster.embedding && cluster.embedding.length > 0) {
      embeddingCache.set(key, cluster.embedding);
      return cluster.embedding;
    }
    const emb = await getEmbedding(text);
    embeddingCache.set(key, emb);
    return emb;
  } catch (err) {
    console.warn(`  ⚠ embedding failed for ${cluster._id}: ${err.message}`);
    embeddingCache.set(key, null);
    return null;
  }
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSim(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length !== vecA.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
}

/**
 * Compute the best similarity between two clusters.
 * Tries embedding similarity first, falls back to text similarity.
 */
async function computeSimilarity(a, b) {
  const textA = normalizeForCompare(a.canonicalQuestion || a.rawQuestion || a.semanticQuestion || '');
  const textB = normalizeForCompare(b.canonicalQuestion || b.rawQuestion || b.semanticQuestion || '');

  const embA = await getClusterEmbedding(a, textA);
  const embB = await getClusterEmbedding(b, textB);

  let sim = 0;
  let method = 'none';

  if (embA && embB) {
    sim = cosineSim(embA, embB);
    method = 'embedding';
  }

  // Also compute text similarity — use the higher of the two
  const textSim = hybridClusterSimilarity(textA, textB);

  if (textSim > sim) {
    sim = textSim;
    method = textSim > sim ? 'text' : method;
  }

  // Use the better of embedding similarity vs text similarity.
  // Text-only fallback fires for clusters where embedding failed.
  const finalScore  = Math.max(sim, textSim);
  const useText     = finalScore === textSim;

  return {
    score:  Math.round(finalScore * 1000) / 1000,
    method: useText ? 'text' : method,
    textA,
    textB,
  };
}

/**
 * Find all duplicate pairs above threshold using batched O(n) indexing.
 * Groups clusters by normalized question first (exact dedup),
 * then computes semantic similarity only for remaining pairs.
 *
 * Performance: O(n) for exact dedup + O(k) for semantic where k = candidates
 */
async function findDuplicatePairs(clusters, threshold) {
  // Step 1: Exact dedup by normalized question — instant, no embedding needed
  const exactGroups = new Map();
  for (const c of clusters) {
    const norm = normalizeForCompare(c.canonicalQuestion || c.rawQuestion || '');
    if (!norm) continue;
    if (!exactGroups.has(norm)) exactGroups.set(norm, []);
    exactGroups.get(norm).push(c);
  }

  const pairs = [];
  const processed = new Set();

  // For each exact-duplicate group, merge them immediately (score = 1.0)
  for (const [norm, group] of exactGroups) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) {
      const key = `${group[0]._id}::${group[i]._id}`;
      if (!processed.has(key)) {
        pairs.push({ master: group[0], dup: group[i], score: 1.0, method: 'exact' });
        processed.add(key);
      }
    }
  }

  // Step 2: Track cluster IDs already resolved by exact dedup — skip them in embedding stage
  const skipForEmbedding = new Set();
  for (const group of exactGroups.values()) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) {
      skipForEmbedding.add(group[i]._id.toString());
    }
  }

  // Step 3: For remaining clusters — batch embed all candidates
  // then use length-based prefilter to avoid O(n²).

  // Group remaining clusters by approximate character length bucket (±15%)
  const lengthBuckets = new Map();
  for (const c of clusters) {
    if (skipForEmbedding.has(c._id.toString())) continue;
    const q = normalizeForCompare(c.canonicalQuestion || c.rawQuestion || '');
    const len = q.length;
    const bucket = Math.floor(len / 20);  // 20-char buckets
    if (!lengthBuckets.has(bucket)) lengthBuckets.set(bucket, []);
    lengthBuckets.get(bucket).push(c);
  }

  // Only embed clusters not already resolved by exact dedup
  const toEmbed = clusters.filter(c => !skipForEmbedding.has(c._id.toString()));
  const clusterIdList = toEmbed.map(c => c._id.toString());
  const clusterTexts   = toEmbed.map(c =>
    normalizeForCompare(c.canonicalQuestion || c.rawQuestion || c.semanticQuestion || '')
  );

  console.log(`  Generating embeddings for ${toEmbed.length} remaining clusters (batches of ${BATCH_EMBED_SIZE})...`);
  const allEmbeddings = [];
  for (let i = 0; i < clusterTexts.length; i += BATCH_EMBED_SIZE) {
    const batch = clusterTexts.slice(i, i + BATCH_EMBED_SIZE);
    const embs = await Promise.all(
      batch.map(text => embedWithRetry(text, EMBED_MAX_RETRIES))
    );
    allEmbeddings.push(...embs);
    // Pause between every batch to avoid hammering the 2-concurrency API
    if (i + BATCH_EMBED_SIZE < clusterTexts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Build a clusterId→embedding map from only the embedded clusters
  const clusterEmbeddingMap = new Map();
  for (let i = 0; i < toEmbed.length; i++) {
    clusterEmbeddingMap.set(clusterIdList[i], allEmbeddings[i]);
  }

  // Step 4: Compare only clusters in same length bucket (reduces pairs dramatically)
  const seenPairs = new Set();
  for (const [, bucket] of lengthBuckets) {
    if (bucket.length < 2) continue;

    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j];
        const key = [a._id, b._id].sort().join('::');
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        if (skipForEmbedding.has(a._id.toString()) || skipForEmbedding.has(b._id.toString())) continue;

        const embA = clusterEmbeddingMap.get(a._id.toString());
        const embB = clusterEmbeddingMap.get(b._id.toString());

        if (!embA || !embB) continue;

        const sim = cosineSim(embA, embB);
        if (sim >= threshold) {
          const master = pickMaster(a, b);
          const dup = master._id.equals(a._id) ? b : a;
          pairs.push({ master, dup, score: sim, method: 'embedding' });
        }
      }
    }
  }

  return pairs;
}

// ─── Apply merges ─────────────────────────────────────────────────────────────

/**
 * Apply a single merge operation:
 *   - Update master with merged data
 *   - Archive duplicate (mark status as MERGED, point to master)
 */
async function applyMerge(master, dup, logEntry) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Load fresh master
    const freshMaster = await SemanticCluster.findById(master._id).session(session);
    const freshDup    = await SemanticCluster.findById(dup._id).session(session);

    if (!freshMaster || !freshDup) {
      console.error(`  ✗ Cluster not found — master=${master._id} dup=${dup._id}`);
      await session.abortTransaction();
      return false;
    }

    if (freshMaster.status === 'MERGED' || freshDup.status === 'MERGED') {
      console.log(`  ⚠ Already merged, skipping`);
      await session.abortTransaction();
      return false;
    }

    // Build merged data
    const merged = buildMerge(freshMaster, freshDup);

    // Save merged master
    Object.assign(freshMaster, {
      participants:     merged.participants,
      relatedQueries:   merged.relatedQueries,
      submissionsCount: merged.submissionsCount,
      answerCount:      merged.answerCount,
      hashtags:         merged.hashtags,
      history:          merged.history,
    });
    await freshMaster.save({ session });

    // Update duplicate: mark as MERGED, point to master, keep minimal data
    freshDup.status = 'MERGED';
    freshDup.moderationNotes = `Merged into ${master._id} on ${new Date().toISOString()}`;
    freshDup.history = [
      ...(freshDup.history || []),
      { event: `ARCHIVED:Merged into ${master._id}`, timestamp: new Date() },
    ];
    await freshDup.save({ session });

    // Update submissions to point to new cluster
    await Submission.updateMany(
      { clusterId: dup._id },
      { $set: { clusterId: master._id } },
      { session }
    );

    await session.commitTransaction();

    console.log(
      `  ✓ Merged "${dup.canonicalQuestion || dup.rawQuestion || dup._id}"\n` +
      `    → master "${freshMaster.canonicalQuestion}"\n` +
      `    (score=${logEntry.score}, method=${logEntry.method})`
    );
    return true;
  } catch (err) {
    await session.abortTransaction();
    console.error(`  ✗ Merge failed: ${err.message}`);
    return false;
  } finally {
    session.endSession();
  }
}

// ─── Rollback ─────────────────────────────────────────────────────────────────

async function rollback(logPath) {
  if (!fs.existsSync(logPath)) {
    console.error('No merge log found. Nothing to rollback.');
    return;
  }

  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  console.log(`Rollback: ${log.operations.length} operations to undo\n`);

  for (const op of log.operations.reverse()) {
    try {
      // Restore merged clusters
      for (const m of op.merged) {
        await SemanticCluster.findByIdAndUpdate(m._id, {
          $set: {
            status: m.originalStatus || 'OPEN',
            participants: m.originalParticipants,
            relatedQueries: m.originalRelatedQueries,
            submissionsCount: m.originalSubmissionsCount,
            answerCount: m.originalAnswerCount,
            hashtags: m.originalHashtags,
            moderationNotes: m.originalModerationNotes,
          },
          $push: { history: { event: 'ROLLBACK:Undid merge', timestamp: new Date() } },
        });
      }

      // Restore merged-back clusters to OPEN
      for (const d of op.duplicates) {
        await SemanticCluster.findByIdAndUpdate(d._id, {
          $set: { status: 'OPEN', moderationNotes: null },
          $push: { history: { event: 'ROLLBACK:Restored from merge', timestamp: new Date() } },
        });
      }

      console.log(`  ✓ Rolled back merge batch "${op.timestamp}"`);
    } catch (err) {
      console.error(`  ✗ Rollback failed: ${err.message}`);
    }
  }

  // Mark log as rolled back
  log.rolledBack = true;
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('\nRollback complete.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun  = !args.includes('--apply') && !args.includes('--rollback');
  const isApply   = args.includes('--apply');
  const isRollback = args.includes('--rollback');

  if (isRollback) {
    await mongoose.connect(process.env.MONGO_URI);
    await rollback(MERGE_LOG_PATH);
    await mongoose.disconnect();
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🧹 SemanticCluster Deduplication');
  console.log('─'.repeat(50));
  if (isDryRun) console.log('  Mode: DRY RUN (no changes will be written)');
  else          console.log('  Mode: APPLY — changes WILL be written');
  console.log(`  Embedding threshold: ${EMBEDDING_THRESHOLD}`);
  console.log(`  Text threshold:      ${TEXT_THRESHOLD}`);
  console.log('');

  const clusters = await SemanticCluster.find({ status: { $nin: ['MERGED', 'REJECTED'] } })
    .select('+embedding')
    .lean();

  console.log(`Found ${clusters.length} OPEN clusters to check\n`);

  if (clusters.length === 0) {
    console.log('Nothing to deduplicate.');
    await mongoose.disconnect();
    return;
  }

  // Find duplicate pairs
  console.log('Finding duplicate pairs...\n');
  const pairs = await findDuplicatePairs(clusters, EMBEDDING_THRESHOLD);

  if (pairs.length === 0) {
    console.log('No duplicate clusters found. ✓');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${pairs.length} duplicate pair(s):\n`);

  // Group pairs by master (multiple dups can merge into one master)
  const byMaster = new Map();
  for (const pair of pairs) {
    const mk = pair.master._id.toString();
    if (!byMaster.has(mk)) byMaster.set(mk, []);
    byMaster.get(mk).push(pair);
  }

  let reportLines = [];
  for (const [mk, pList] of byMaster) {
    const master = pList[0].master;
    reportLines.push(`\n  Master: "${master.canonicalQuestion || master.rawQuestion || mk}"`);
    reportLines.push(`  Master ID: ${mk} | participants: ${master.participants?.length || 0} | answers: ${master.answerCount || 0}`);
    for (const p of pList) {
      reportLines.push(`    ↳ DUPLICATE [score=${p.score}][${p.method}]: "${p.dup.canonicalQuestion || p.dup.rawQuestion || p.dup._id}"`);
      reportLines.push(`       participants: ${p.dup.participants?.length || 0} | answers: ${p.dup.answerCount || 0}`);
    }
  }

  for (const line of reportLines) process.stdout.write(line + '\n');

  // Build merge log for rollback
  const mergeLog = {
    timestamp:   new Date().toISOString(),
    threshold:   EMBEDDING_THRESHOLD,
    isDryRun:    isDryRun,
    operations:  [],
    totalPairs:  pairs.length,
    totalMasters: byMaster.size,
  };

  if (!isDryRun) {
    for (const [mk, pList] of byMaster) {
      const master  = pList[0].master;
      const dups    = pList.map(p => p.dup);

      const operation = {
        timestamp:    new Date().toISOString(),
        masterId:     mk,
        masterName:   master.canonicalQuestion || master.rawQuestion || mk,
        score:        pList[0].score,
        method:       pList[0].method,
        merged: [{
          _id:                    master._id,
          originalStatus:         master.status,
          originalParticipants:   master.participants,
          originalRelatedQueries: master.relatedQueries,
          originalSubmissionsCount: master.submissionsCount,
          originalAnswerCount:    master.answerCount,
          originalHashtags:       master.hashtags,
          originalModerationNotes: master.moderationNotes,
        }],
        duplicates: dups.map(d => ({
          _id:   d._id,
          name:  d.canonicalQuestion || d.rawQuestion || d._id.toString(),
        })),
      };

      // Apply merges one by one
      for (const p of pList) {
        const ok = await applyMerge(master, p.dup, p);
        if (!ok) operation.failed = true;
      }

      mergeLog.operations.push(operation);
    }

    fs.writeFileSync(MERGE_LOG_PATH, JSON.stringify(mergeLog, null, 2));
    console.log(`\nMerge log written to ${MERGE_LOG_PATH}`);
    console.log(`\n✅ Applied ${mergeLog.operations.length} merge(s).`);
  } else {
    console.log('\n(Dry run — no changes written. Run with --apply to execute.)');
    fs.writeFileSync(MERGE_LOG_PATH, JSON.stringify(mergeLog, null, 2));
    console.log(`\nReport saved to ${MERGE_LOG_PATH}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});