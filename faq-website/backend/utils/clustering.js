const SemanticCluster = require('../models/SemanticCluster');
const getEmbedding = require('./embedding');
const { generateCanonicalTitle } = require('./generateCanonicalTitle');

const SIMILARITY_THRESHOLD = 0.82; // cosine similarity ≥ this → auto-merge

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Find a matching OPEN cluster for a new question, or create one.
 *
 * Returns:
 *   { cluster, isNew, joinMethod, typedQuestion }
 *
 *   isNew = true  → new cluster created (typedQuestion = the submitted question)
 *   isNew = false → merged into existing cluster
 *                    joinMethod = 'AUTO_CLUSTERED'
 *                    typedQuestion = the submitted question (stored as relatedQuery)
 */
async function findOrCreateCluster(question, context, userId, threshold = SIMILARITY_THRESHOLD, category = '', customCategory = '') {
  const combinedText = `${question}\n${context}`;
  const embedding = await getEmbedding(combinedText);

  let bestMatch = null;
  let highestSimilarity = -1;

  if (!embedding || embedding.length === 0) {
    console.warn('[clustering] No embedding — bypassing semantic search, creating fresh cluster.');
  } else {
    const openClusters = await SemanticCluster.find({ status: 'OPEN' }).select('embedding canonicalQuestion');
    for (const cluster of openClusters) {
      if (!cluster.embedding) continue;
      const similarity = cosineSimilarity(embedding, cluster.embedding);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = cluster;
      }
    }
  }

  if (highestSimilarity >= threshold && bestMatch) {
    // ── Merge into existing cluster ───────────────────────────────────────
    // We don't modify the existing cluster here — the caller (controller)
    // decides whether to also bump participants / relatedQueries.
    return {
      cluster: bestMatch,
      isNew: false,
      joinMethod: 'AUTO_CLUSTERED',
      typedQuestion: question,
    };
  }

  // ── No match — create a new cluster ─────────────────────────────────────
  const { canonicalQuestion, hashtags } = await generateCanonicalTitle(question, context);
  const newCluster = new SemanticCluster({
    canonicalQuestion,
    originalQuestion: question,
    creatorId: userId,
    context,
    embedding: (embedding && embedding.length > 0) ? embedding : undefined,
    category,
    customCategory,
    hashtags,
    participants: [{
      userId,
      joinedAt: new Date(),
      joinMethod: 'MANUAL',
      question,  // the creator's typed question goes in as their "variant"
    }],
    relatedQueries: [{
      userId,
      question,
      joinedAt: new Date(),
      joinMethod: 'MANUAL',
    }],
    history: [{ event: 'Discussion created', timestamp: new Date() }],
  });
  await newCluster.save();
  return { cluster: newCluster, isNew: true, joinMethod: 'MANUAL', typedQuestion: question };
}

module.exports = { findOrCreateCluster, cosineSimilarity, SIMILARITY_THRESHOLD };