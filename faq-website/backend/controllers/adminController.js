const mongoose = require('mongoose');
const SemanticCluster = require('../models/SemanticCluster');
const FAQ = require('../models/FAQ');
const PersonalTicket = require('../models/PersonalTicket');
const SolvedPersonalIssue = require('../models/SolvedPersonalIssue');
const Submission = require('../models/Submission');
const getEmbedding = require('../utils/embedding');
const { extractPersonalIntent } = require('../utils/intentExtractor');
const { FAQ_CATEGORIES } = require('../utils/constants');

exports.getReviewQueue = async (req, res) => {
  try {
    const clusters = await SemanticCluster.find({ status: 'ADMIN_REVIEW' }).lean();
    res.json({ success: true, clusters });
  } catch (err) {
    console.error('getReviewQueue error:', err);
    res.status(500).json({ success: false, error: 'Failed to load review queue: ' + err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    res.json({ categories: FAQ_CATEGORIES.map(name => ({ name })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCategory = async (req, res) => {
  // Deprecated as categories are now static constants
  res.status(400).json({ error: 'Category creation is disabled. Categories are immutable constants.' });
};

exports.promoteToFaq = async (req, res) => {
  try {
    const { 
      clusterId, 
      categoryName, 
      editedQuestion, 
      editedOriginalQuestion,
      editedAnswer, 
      tags,
      customCategory
    } = req.body;

    const cluster = await SemanticCluster.findById(clusterId);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    let finalCategory = 'Other';
    if (categoryName && FAQ_CATEGORIES.includes(categoryName.trim())) {
      finalCategory = categoryName.trim();
    }

    const questionText = editedQuestion || cluster.canonicalQuestion;
    const answerText = editedAnswer || cluster.aiGeneratedAnswer;

    // Regenerate embedding if question text was edited
    let embedding = cluster.embedding;
    if (editedQuestion && editedQuestion.trim() !== cluster.canonicalQuestion) {
      const newEmbedding = await getEmbedding(editedQuestion.trim());
      if (newEmbedding && newEmbedding.length > 0) {
        embedding = newEmbedding;
      }
    }

    const faq = new FAQ({
      clusterId: cluster._id,
      category: finalCategory,
      customCategory: customCategory !== undefined ? customCategory : cluster.customCategory,
      question: questionText,
      answer: answerText,
      embedding,
      tags: tags || cluster.tags || []
    });
    await faq.save();

    cluster.status = 'PROMOTED';
    cluster.canonicalQuestion = questionText;
    if (editedOriginalQuestion !== undefined) {
      cluster.originalQuestion = editedOriginalQuestion;
    }
    cluster.aiGeneratedAnswer = answerText;
    cluster.customCategory = customCategory !== undefined ? customCategory : cluster.customCategory;
    cluster.tags = tags || cluster.tags || [];
    cluster.embedding = embedding;
    cluster.moderationNotes = `Promoted to FAQ by admin ${req.user.id}`;
    await cluster.save();

    res.json({ message: 'FAQ successfully promoted', faq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectCluster = async (req, res) => {
  try {
    const { clusterId } = req.body;
    const cluster = await SemanticCluster.findById(clusterId);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    cluster.status = 'REJECTED';
    cluster.moderationNotes = `Rejected by admin ${req.user.id}`;
    await cluster.save();

    res.json({ message: 'Cluster rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET PENDING PERSONAL TICKETS
exports.getPersonalTickets = async (req, res) => {
  try {
    const tickets = await PersonalTicket.find({ status: 'pending' })
      .populate('userId', 'email institution')
      .lean();
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('getPersonalTickets error:', err);
    res.status(500).json({ success: false, error: 'Failed to load personal tickets: ' + err.message });
  }
};

// RESOLVE PERSONAL TICKET
exports.resolvePersonalTicket = async (req, res) => {
  try {
    const { ticketId, resolvedAnswer, quirks } = req.body;

    const ticket = await PersonalTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Personal Ticket not found' });

    ticket.status = 'resolved';
    ticket.resolvedAnswer = resolvedAnswer;
    ticket.quirks = quirks;
    ticket.resolvedBy = req.user.id;
    await ticket.save();

    // Step 4: Extract Intent & Normalize
    let intentText = ticket.normalizedIntent;
    let category = ticket.category;
    let finalQuirks = quirks || ticket.quirks;

    if (!intentText) {
      const extracted = await extractPersonalIntent(ticket.question, ticket.context);
      intentText = extracted.normalizedIntent;
      category = extracted.category;
      if (!finalQuirks) finalQuirks = extracted.subRequirement;
    }

    // Generate Intent Embedding
    const embedding = await getEmbedding(intentText);

    // Save to SolvedPersonalIssue database
    const solvedIssue = new SolvedPersonalIssue({
      normalizedIntent: intentText,
      embedding,
      verifiedAnswer: resolvedAnswer,
      institution: ticket.institution,
      category: category || 'General',
      quirks: finalQuirks,
      adminMetadata: {
        resolvedFromTicketId: ticket._id,
        resolvedByUserId: req.user.id,
        resolvedAt: new Date()
      }
    });
    await solvedIssue.save();

    res.json({ message: 'Personal ticket resolved and stored in solved issue memory.', ticket, solvedIssue });
  } catch (err) {
    console.error('Resolve personal ticket failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Deduplication Admin Tools ────────────────────────────────────────────────

/** Shared similarity helpers (inline to avoid circular require) */
function normalizeForCompare(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cosineSim(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length !== vecA.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) { dot += vecA[i] * vecB[i]; magA += vecA[i] * vecA[i]; magB += vecB[i] * vecB[i]; }
  magA = Math.sqrt(magA); magB = Math.sqrt(magB);
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
}

function tokenOverlapSim(a, b) {
  const STOPWORDS = new Set(['i','a','an','the','is','are','was','do','does','can','will','have','has','be','been','this','that','it','its','they','them','we','us','our','you','your','what','which','who','when','where','why','how','all','some','any','no','not','of','to','for','in','on','at','by','with','from']);
  const normA = normalizeForCompare(a);
  const normB = normalizeForCompare(b);
  const lenRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
  if (lenRatio < 0.4) return 0;
  const tokA = new Set(normA.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t)));
  const tokB = new Set(normB.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t)));
  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;
  const intersection = [...tokA].filter(t => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : intersection / union;
}

function hybridSim(a, b) {
  const normA = normalizeForCompare(a);
  const normB = normalizeForCompare(b);
  if (normA === normB) return 1;
  const getNgrams = (s, n = 3) => { const set = new Set(); for (let i = 0; i <= s.length - n; i++) set.add(s.slice(i, i + n)); return set; };
  const ngA = getNgrams(normA), ngB = getNgrams(normB);
  const intersection = [...ngA].filter(c => ngB.has(c)).length;
  const union = new Set([...ngA, ...ngB]).size;
  const ngramSim = union === 0 ? 0 : intersection / union;
  const tokSim = tokenOverlapSim(a, b);
  const lenRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
  return (ngramSim * 0.55) + (tokSim * 0.25) + (lenRatio * 0.20);
}

function pickMaster(a, b) {
  const score = c =>
    (c.participants?.length || 0) +
    (c.submissionsCount || 0) * 0.5 +
    (c.answerCount || 0) * 2 +
    (c.spWeight || 0) * 0.1;
  return score(a) >= score(b) ? a : b;
}

/**
 * GET /api/admin/duplicates
 * Returns all detected duplicate pairs above threshold for admin review.
 */
exports.getDuplicateSuggestions = async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold || '0.82');

    const clusters = await SemanticCluster.find({ status: { $nin: ['MERGED', 'REJECTED'] } })
      .select('canonicalQuestion rawQuestion semanticQuestion context participants submissionsCount answerCount spWeight createdAt hashtags')
      .lean();

    if (clusters.length === 0) return res.json({ pairs: [], summary: { total: 0 } });

    // Fast exact-dedup pass first
    const exactMap = new Map();
    for (const c of clusters) {
      const norm = normalizeForCompare(c.canonicalQuestion || c.rawQuestion || '');
      if (!norm) continue;
      if (!exactMap.has(norm)) exactMap.set(norm, []);
      exactMap.get(norm).push(c);
    }

    const pairs = [];

    // Exact duplicates (score = 1.0)
    for (const [, group] of exactMap) {
      if (group.length < 2) continue;
      const master = group.reduce(pickMaster);
      for (let i = 0; i < group.length; i++) {
        if (group[i]._id.toString() === master._id.toString()) continue;
        pairs.push({
          master:       { _id: master._id, canonicalQuestion: master.canonicalQuestion, rawQuestion: master.rawQuestion },
          duplicate:    { _id: group[i]._id, canonicalQuestion: group[i].canonicalQuestion, rawQuestion: group[i].rawQuestion },
          score:        1.0,
          method:       'exact',
          masterStats:  { participants: master.participants?.length || 0, submissionsCount: master.submissionsCount || 0, answerCount: master.answerCount || 0 },
          dupStats:     { participants: group[i].participants?.length || 0, submissionsCount: group[i].submissionsCount || 0, answerCount: group[i].answerCount || 0 },
        });
      }
    }

    // Semantic similarity for length-similar pairs
    const seenPairs = new Set(pairs.map(p => `${p.master._id}::${p.duplicate._id}`));

    // Batch embeddings for all clusters
    const texts = clusters.map(c => normalizeForCompare(c.canonicalQuestion || c.rawQuestion || c.semanticQuestion || ''));
    const BATCH = 20;
    const embeddings = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const embs  = await Promise.all(batch.map(t => getEmbedding(t).catch(() => null)));
      embeddings.push(...embs);
      if ((i + BATCH) % (BATCH * 5) === 0) await new Promise(r => setTimeout(r, 1000));
    }

    // Compare same-length-bucket clusters
    const lenBuckets = new Map();
    for (let i = 0; i < clusters.length; i++) {
      const len = texts[i].length;
      const bucket = Math.floor(len / 20);
      if (!lenBuckets.has(bucket)) lenBuckets.set(bucket, []);
      lenBuckets.get(bucket).push({ c: clusters[i], emb: embeddings[i], text: texts[i] });
    }

    for (const [, bucket] of lenBuckets) {
      if (bucket.length < 2) continue;
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const { c: a, emb: embA, text: textA } = bucket[i];
          const { c: b, emb: embB, text: textB } = bucket[j];
          const key = [a._id.toString(), b._id.toString()].sort().join('::');
          if (seenPairs.has(key)) continue;

          let sim = 0, method = 'text';
          if (embA && embB) {
            sim = cosineSim(embA, embB);
            method = 'embedding';
          }
          const textSim = hybridSim(textA, textB);
          if (textSim > sim) { sim = textSim; method = 'text'; }

          if (sim >= threshold) {
            seenPairs.add(key);
            const master = pickMaster(a, b);
            const dup    = master._id.equals(a._id) ? b : a;
            pairs.push({
              master:       { _id: master._id, canonicalQuestion: master.canonicalQuestion, rawQuestion: master.rawQuestion },
              duplicate:    { _id: dup._id, canonicalQuestion: dup.canonicalQuestion, rawQuestion: dup.rawQuestion },
              score:        Math.round(sim * 1000) / 1000,
              method,
              masterStats:  { participants: master.participants?.length || 0, submissionsCount: master.submissionsCount || 0, answerCount: master.answerCount || 0 },
              dupStats:     { participants: dup.participants?.length || 0, submissionsCount: dup.submissionsCount || 0, answerCount: dup.answerCount || 0 },
            });
          }
        }
      }
    }

    res.json({
      pairs,
      summary: {
        total:             pairs.length,
        exactDuplicates:   pairs.filter(p => p.method === 'exact').length,
        semanticallySimilar: pairs.filter(p => p.method !== 'exact').length,
        clustersChecked:   clusters.length,
        threshold,
      },
    });
  } catch (err) {
    console.error('getDuplicateSuggestions error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/merge-duplicate
 * Merges a specific duplicate into its master cluster.
 * { masterId, duplicateId }
 */
exports.applyMerge = async (req, res) => {
  try {
    const { masterId, duplicateId } = req.body;
    if (!masterId || !duplicateId) return res.status(400).json({ error: 'masterId and duplicateId required' });
    if (masterId === duplicateId) return res.status(400).json({ error: 'Cannot merge cluster with itself' });

    const session = await mongoose.startSession();
    session.startTransaction();

    const [master, dup] = await Promise.all([
      SemanticCluster.findById(masterId).session(session),
      SemanticCluster.findById(duplicateId).session(session),
    ]);

    if (!master) { await session.abortTransaction(); return res.status(404).json({ error: 'Master cluster not found' }); }
    if (!dup)    { await session.abortTransaction(); return res.status(404).json({ error: 'Duplicate cluster not found' }); }
    if (master.status === 'MERGED' || dup.status === 'MERGED') {
      await session.abortTransaction();
      return res.status(409).json({ error: 'One or both clusters are already merged' });
    }

    // Merge participants
    for (const p of dup.participants || []) {
      const already = master.participants.find(x => x.userId?.toString() === p.userId?.toString());
      if (!already) {
        master.participants.push({ ...p.toObject(), joinMethod: 'AUTO_CLUSTERED', mergedFrom: dup._id.toString() });
      }
    }

    // Merge relatedQueries
    for (const rq of dup.relatedQueries || []) {
      const already = master.relatedQueries.find(x => x.userId?.toString() === rq.userId?.toString());
      if (!already) {
        master.relatedQueries.push({ ...rq.toObject(), mergedFrom: dup._id.toString() });
      }
    }

    master.submissionsCount = (master.submissionsCount || 0) + (dup.submissionsCount || 0);
    master.answerCount      = Math.max(master.answerCount || 0, dup.answerCount || 0);
    master.hashtags         = [...new Set([...(master.hashtags || []), ...(dup.hashtags || [])])];
    master.history.push({ event: `MERGED:${dup._id} (${normalizeForCompare(dup.canonicalQuestion || dup.rawQuestion || '')})`, timestamp: new Date() });

    dup.status          = 'MERGED';
    dup.moderationNotes = `Manually merged into ${master._id} by admin ${req.user.id} on ${new Date().toISOString()}`;
    dup.history.push({ event: `ARCHIVED:Manually merged into ${master._id}`, timestamp: new Date() });

    await Promise.all([master.save({ session }), dup.save({ session })]);

    // Re-point submissions
    await Submission.updateMany({ clusterId: dup._id }, { $set: { clusterId: master._id } }, { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Merged "${dup.canonicalQuestion || dup.rawQuestion}" into "${master.canonicalQuestion || master.rawQuestion}"`,
      master: { _id: master._id, submissionsCount: master.submissionsCount, participants: master.participants.length },
    });
  } catch (err) {
    console.error('applyMerge error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/run-deduplication
 * Runs the full retroactive deduplication script (dry-run or apply).
 */
exports.runDeduplication = async (req, res) => {
  try {
    const { apply } = req.body; // if true, actually writes changes

    // Delegate to the script (imported inline to avoid require循环)
    // Instead, we inline the logic here for the API call
    const threshold = parseFloat(req.body.threshold || '0.82');

    const clusters = await SemanticCluster.find({ status: { $nin: ['MERGED', 'REJECTED'] } })
      .select('canonicalQuestion rawQuestion semanticQuestion context participants submissionsCount answerCount spWeight createdAt hashtags embedding')
      .lean();

    if (clusters.length === 0) return res.json({ success: true, merged: 0, pairs: [] });

    // Find pairs using same logic as script
    const exactMap = new Map();
    for (const c of clusters) {
      const norm = normalizeForCompare(c.canonicalQuestion || c.rawQuestion || '');
      if (!norm) continue;
      if (!exactMap.has(norm)) exactMap.set(norm, []);
      exactMap.get(norm).push(c);
    }

    const pairs = [];
    for (const [, group] of exactMap) {
      if (group.length < 2) continue;
      const master = group.reduce(pickMaster);
      for (let i = 0; i < group.length; i++) {
        if (group[i]._id.toString() === master._id.toString()) continue;
        pairs.push({ master: group[i >= 1 ? 0 : 1], dup: group[i], score: 1.0, method: 'exact' });
      }
    }

    // Fast semantic pass with batch embeddings
    const texts = clusters.map(c => normalizeForCompare(c.canonicalQuestion || c.rawQuestion || c.semanticQuestion || ''));
    const BATCH = 20;
    const embeddings = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const embs  = await Promise.all(batch.map(t => getEmbedding(t).catch(() => null)));
      embeddings.push(...embs);
      if ((i + BATCH) % (BATCH * 5) === 0) await new Promise(r => setTimeout(r, 1000));
    }

    const seenPairs = new Set(pairs.map(p => `${p.master._id}::${p.dup._id}`.split('::').sort().join('::')));
    const lenBuckets = new Map();
    for (let i = 0; i < clusters.length; i++) {
      const bucket = Math.floor(texts[i].length / 20);
      if (!lenBuckets.has(bucket)) lenBuckets.set(bucket, []);
      lenBuckets.get(bucket).push({ c: clusters[i], emb: embeddings[i] });
    }

    for (const [, bucket] of lenBuckets) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const { c: a, emb: embA } = bucket[i];
          const { c: b, emb: embB } = bucket[j];
          const key = [a._id.toString(), b._id.toString()].sort().join('::');
          if (seenPairs.has(key)) continue;
          if (!embA || !embB) continue;
          const sim = cosineSim(embA, embB);
          if (sim >= threshold) {
            seenPairs.add(key);
            const master = pickMaster(a, b);
            const dup    = master._id.equals(a._id) ? b : a;
            pairs.push({ master, dup, score: Math.round(sim * 1000) / 1000, method: 'embedding' });
          }
        }
      }
    }

    if (!apply) {
      return res.json({
        success: true,
        dryRun:  true,
        merged:  0,
        pairs:   pairs.map(p => ({
          master:      { _id: p.master._id, canonicalQuestion: p.master.canonicalQuestion },
          duplicate:   { _id: p.dup._id, canonicalQuestion: p.dup.canonicalQuestion },
          score:       p.score,
          method:      p.method,
        })),
        summary: { total: pairs.length, clustersChecked: clusters.length, threshold },
      });
    }

    // Apply merges
    const results = [];
    for (const p of pairs) {
      try {
        const session = await mongoose.startSession();
        session.startTransaction();

        const [master, dup] = await Promise.all([
          SemanticCluster.findById(p.master._id).session(session),
          SemanticCluster.findById(p.dup._id).session(session),
        ]);

        if (!master || !dup || master.status === 'MERGED' || dup.status === 'MERGED') {
          await session.abortTransaction(); session.endSession(); continue;
        }

        for (const participant of dup.participants || []) {
          const already = master.participants.find(x => x.userId?.toString() === participant.userId?.toString());
          if (!already) master.participants.push({ ...participant.toObject(), joinMethod: 'AUTO_CLUSTERED' });
        }

        master.submissionsCount = (master.submissionsCount || 0) + (dup.submissionsCount || 0);
        master.answerCount      = Math.max(master.answerCount || 0, dup.answerCount || 0);
        master.hashtags         = [...new Set([...(master.hashtags || []), ...(dup.hashtags || [])])];
        master.history.push({ event: `MERGED:${dup._id}`, timestamp: new Date() });

        dup.status          = 'MERGED';
        dup.moderationNotes = `Auto-merged into ${master._id} by dedup run on ${new Date().toISOString()}`;
        dup.history.push({ event: `ARCHIVED:auto-merged`, timestamp: new Date() });

        await Promise.all([master.save({ session }), dup.save({ session })]);
        await Submission.updateMany({ clusterId: dup._id }, { $set: { clusterId: master._id } }, { session });

        await session.commitTransaction();
        session.endSession();

        results.push({ masterId: master._id, duplicateId: dup._id, status: 'merged' });
      } catch (err) {
        console.error(`Merge error for pair ${p.master._id} + ${p.dup._id}: ${err.message}`);
      }
    }

    res.json({
      success:     true,
      dryRun:      false,
      merged:      results.length,
      pairs:       pairs.map(p => ({ master: p.master._id, duplicate: p.dup._id, score: p.score })),
      summary:     { total: pairs.length, applied: results.length, clustersChecked: clusters.length, threshold },
    });
  } catch (err) {
    console.error('runDeduplication error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/split-cluster
 * Un-merges a cluster by restoring a merged-back duplicate to OPEN status.
 */
exports.splitCluster = async (req, res) => {
  try {
    const { clusterId } = req.body;
    const cluster = await SemanticCluster.findById(clusterId);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    cluster.status = 'OPEN';
    cluster.moderationNotes = `Manually un-merged / split by admin ${req.user.id} on ${new Date().toISOString()}`;
    cluster.history.push({ event: 'SPLIT:Un-merged from merged status', timestamp: new Date() });
    await cluster.save();

    res.json({ success: true, message: `Cluster ${clusterId} restored to OPEN status.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
