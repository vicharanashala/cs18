const mongoose = require('mongoose');
const SemanticCluster = require('../models/SemanticCluster');
const FAQ = require('../models/FAQ');
const PersonalTicket = require('../models/PersonalTicket');
const SolvedPersonalIssue = require('../models/SolvedPersonalIssue');
const Submission = require('../models/Submission');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const ContributedFAQ = require('../models/ContributedFAQ');
const SearchAnalytics = require('../models/SearchAnalytics');
const Cluster = require('../models/Cluster');
const Attachment = require('../models/Attachment');
const fs = require('fs');
const path = require('path');
const getEmbedding = require('../utils/embedding');
const { extractPersonalIntent } = require('../utils/intentExtractor');


exports.getReviewQueue = async (req, res) => {
  try {
    const clusters = await SemanticCluster.find({ status: 'ADMIN_REVIEW' })
      .sort({ severityScore: -1, createdAt: -1 })
      .populate('attachments.uploadedBy', 'username email')
      .lean();
    res.json({ success: true, clusters });
  } catch (err) {
    console.error('getReviewQueue error:', err);
    res.status(500).json({ success: false, error: 'Failed to load review queue: ' + err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const categories = await Category.find().sort({name: 1}).lean();
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const category = new Category({ name: req.body.name });
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const category = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    res.json({ success: true, category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const FAQ = require('../models/FAQ');
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });
    
    const count = await FAQ.countDocuments({ category: category.name });
    if (count > 0) return res.status(400).json({ success: false, error: `Cannot delete: ${count} FAQs are using this category.` });

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getCategoryStats = async (req, res, next) => {
  try {
    const Category = require('../models/Category');
    const FAQ = require('../models/FAQ');
    const categories = await Category.find().sort({ name: 1 }).lean();
    const stats = await FAQ.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, views: { $sum: "$viewCount" } } }
    ]);
    const statsMap = stats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr }), {});
    
    const result = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      count: statsMap[cat.name]?.count || 0,
      views: statsMap[cat.name]?.views || 0,
      createdAt: cat.createdAt
    }));
    res.json({ success: true, categories: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
    const Category = require('../models/Category');
    if (categoryName) {
      const cat = await Category.findOne({ name: categoryName.trim() });
      if (cat) finalCategory = cat.name;
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
      tags: tags || cluster.tags || [],
      attachments: cluster.attachments || []
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
    cluster.promotedToFAQ = true;
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
    let tickets = await PersonalTicket.find({ status: 'pending' })
      .sort({ severityScore: -1, createdAt: -1 })
      .populate('userId', 'email institution')
      .lean();

    // Attach generic Ticket tracking info (assignedMentor, autoRouted, routingReason, acceptedAt)
    const Ticket = require('../models/Ticket');
    const referenceIds = tickets.map(t => t._id);
    const trackers = await Ticket.find({ referenceId: { $in: referenceIds }, type: 'personal' })
      .populate('assignedMentor', 'fullName username email')
      .lean();
    const trackerMap = trackers.reduce((map, tracker) => {
      map[tracker.referenceId.toString()] = tracker;
      return map;
    }, {});

    tickets = tickets.map(t => ({
      ...t,
      trackerInfo: trackerMap[t._id.toString()] || null
    }));

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

/**
 * GET /api/admin/users
 * List all users with pizza slices info (admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/users/:userId/pizza
 * Adjust a user's pizza slices (+/- amount)
 * Body: { amount: Number, action: 'grant' | 'remove' | 'reset' }
 */
exports.adjustUserPizza = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount = 0, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!['grant', 'remove', 'reset', 'setAbsolute'].includes(action)) {
      return res.status(400).json({ error: 'action must be grant, remove, reset, or setAbsolute' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousSlices = user.pizzaSlices;
    let newSlices;
    switch (action) {
      case 'grant':
        newSlices = user.pizzaSlices + Math.abs(amount);
        break;
      case 'remove':
        newSlices = Math.max(0, user.pizzaSlices - Math.abs(amount));
        break;
      case 'reset':
        // Reset to the system default (from settings or schema default of 0)
        const settings = await require('./systemSettingsController').getSettingsCached();
        newSlices = settings?.defaultPizzaSlices ?? 0;
        break;
      case 'setAbsolute':
        newSlices = Math.max(0, Math.abs(req.body.absoluteValue ?? amount));
        break;
    }

    user.pizzaSlices = newSlices;
    user.reputation = Math.floor(user.pizzaSlices / 6) * 10;
    await user.save();

    await require('../models/AuditLog').create({
      adminId: req.user.id,
      adminType: 'Admin',
      adminEmail: req.user.email,
      action: action === 'grant' ? 'PIZZA_GRANTED' : action === 'remove' ? 'PIZZA_REVOKED' : action === 'setAbsolute' ? 'PIZZA_SET' : 'PIZZA_RESET',
      targetType: 'User',
      targetId: user._id,
      targetLabel: user.email,
      reason: req.body.reason || null,
      metadata: { previousValue: previousSlices, newValue: newSlices, amount: action === 'setAbsolute' ? undefined : amount },
    });

    res.json({ success: true, pizzaSlices: user.pizzaSlices, reputation: user.reputation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/users/:userId
 * Get single user details (admin only)
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/users/:userId/pizza
 * Alias — also accept POST for simpler quick-action UI
 */
exports.quickGrantPizza = async (req, res) => {
  req.body.action = 'grant';
  return exports.adjustUserPizza(req, res);
};

/**
 * PATCH /api/admin/users/:userId/spurti
 * Adjust a user's spurti points (+/- amount)
 * Body: { amount: Number, action: 'grant' | 'remove' }
 */
exports.adjustUserSpurti = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount = 0, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!['grant', 'remove', 'setAbsolute'].includes(action)) {
      return res.status(400).json({ error: 'action must be grant, remove, or setAbsolute' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousPoints = user.spurtiPoints;
    let newPoints;
    if (action === 'grant') {
      newPoints = user.spurtiPoints + Math.abs(amount);
    } else if (action === 'remove') {
      newPoints = Math.max(0, user.spurtiPoints - Math.abs(amount));
    } else {
      // setAbsolute: body.absoluteValue is the target value
      newPoints = Math.max(0, Math.abs(req.body.absoluteValue ?? amount));
    }

    user.spurtiPoints = newPoints;
    await user.save();

    // Log to audit
    await require('../models/AuditLog').create({
      adminId: req.user.id,
      adminType: 'Admin',
      adminEmail: req.user.email,
      action: action === 'grant' ? 'SPURTI_GRANTED' : action === 'remove' ? 'SPURTI_REVOKED' : 'SPURTI_SET',
      targetType: 'User',
      targetId: user._id,
      targetLabel: user.email,
      reason: req.body.reason || null,
      metadata: { previousValue: previousPoints, newValue: newPoints, amount: action === 'setAbsolute' ? undefined : amount, setAbsoluteValue: action === 'setAbsolute' ? newPoints : undefined },
    });

    res.json({ success: true, spurtiPoints: user.spurtiPoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/users/:userId/ban
 * Toggle user ban state (ban or unban)
 * Body: { banned: true | false, reason?: string }
 */
exports.toggleBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { banned, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousBannedUntil = user.bannedUntil;

    if (banned) {
      // Ban: set bannedUntil to a far-future date
      user.bannedUntil = new Date('2099-12-31');
    } else {
      // Unban: clear bannedUntil
      user.bannedUntil = null;
    }
    await user.save();

    await require('../models/AuditLog').create({
      adminId: req.user.id,
      adminType: 'Admin',
      adminEmail: req.user.email,
      action: banned ? 'USER_BANNED' : 'USER_UNBANNED',
      targetType: 'User',
      targetId: user._id,
      targetLabel: user.email,
      reason: reason || (banned ? 'Policy violation' : 'Reinstated'),
      metadata: { previousBannedUntil, newBannedUntil: user.bannedUntil },
    });

    res.json({ success: true, bannedUntil: user.bannedUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/users/:userId/suspend
 * Temporarily suspend contributions (set bannedUntil to short window)
 * Body: { days: Number, reason?: string }
 */
exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousBannedUntil = user.bannedUntil;
    const until = new Date();
    until.setDate(until.getDate() + Math.max(1, Math.min(days, 365)));
    user.bannedUntil = until;
    await user.save();

    await require('../models/AuditLog').create({
      adminId: req.user.id,
      adminType: 'Admin',
      adminEmail: req.user.email,
      action: 'USER_SUSPENDED',
      targetType: 'User',
      targetId: user._id,
      targetLabel: user.email,
      reason: reason || 'Contribution suspension',
      metadata: { previousBannedUntil, newBannedUntil: user.bannedUntil, days },
    });

    res.json({ success: true, bannedUntil: user.bannedUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/audit-log
 * Fetch moderation audit log entries
 * Query: ?limit=50&offset=0&userId=<target user filter>
 */
exports.getAuditLog = async (req, res) => {
  try {
    const { limit = 50, offset = 0, userId, action } = req.query;
    const filter = {};
    if (userId) filter.targetId = userId;
    if (action) filter.action = action;

    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('adminId', 'email adminType')
      .lean();

    const total = await AuditLog.countDocuments(filter);
    res.json({ success: true, logs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/users/:userId/history
 * Fetch ban history + moderation history for a specific user
 */
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const AuditLog = require('../models/AuditLog');
    const [banEvents, modEvents] = await Promise.all([
      AuditLog.find({
        targetId: userId,
        action: { $in: ['USER_BANNED', 'USER_UNBANNED', 'USER_SUSPENDED'] },
      }).sort({ timestamp: -1 }).limit(50).lean(),
      AuditLog.find({
        targetId: userId,
        action: { $in: [
          'SPURTI_GRANTED', 'SPURTI_REVOKED', 'SPURTI_SET',
          'PIZZA_GRANTED', 'PIZZA_REVOKED', 'PIZZA_SET',
          'REPUTATION_ADJUSTED',
        ] },
      }).sort({ timestamp: -1 }).limit(50).lean(),
    ]);

    res.json({ success: true, banEvents, modEvents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/me
 * Get the currently authenticated admin's profile and role
 */
exports.getCurrentAdmin = async (req, res) => {
  try {
    const User = require('../models/User');
    // Admins are stored in the User collection with elevated roles
    let admin = await User.findById(req.user.id).select('-password').lean();
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json({ success: true, admin: { id: admin._id, email: admin.email, role: admin.role, createdAt: admin.createdAt } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/user-management/stats
 * Combined stats for all 6 stat cards on the User Management overview.
 * Returns: { totalUsers, activeLast30d, smeCount, contributorCount, pendingSmeReviews, suspendedCount }
 */
exports.getUserManagementStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeLast30d,
      smeCount,
      contributorCount,
      pendingSmeReviews,
      suspendedCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastActive: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ role: 'mentor' }),
      ContributedFAQ.distinct('contributedBy'),
      require('../services/recommendation.service').getSMERecommendations().then(recs => recs.length),
      User.countDocuments({ $or: [{ isBanned: true }, { bannedUntil: { $gt: now } }] }),
    ]);

    res.json({
      totalUsers,
      activeLast30d,
      smeCount,
      contributorCount,
      pendingSmeReviews,
      suspendedCount,
    });
  } catch (err) {
    console.error('[getUserManagementStats]', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/users/:userId/stats
 * Per-user activity stats: questions asked, contributions, FAQs approved
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const [questionCount, contribCount] = await Promise.all([
      require('../models/Submission').countDocuments({ userId }),
      require('../models/ContributedFAQ').countDocuments({ contributedBy: userId }),
    ]);

    const faqCount = await require('../models/FAQ').countDocuments({
      authorId: userId,
      status: 'published',
    });

    res.json({ success: true, stats: { questionCount, contribCount, faqCount } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function getMediaAnalytics() {
  try {
    const total = await Attachment.countDocuments();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = await Attachment.countDocuments({ uploadedAt: { $gte: todayStart } });
    const totalBytes = await Attachment.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]);
    const byType = await Attachment.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    return {
      total, todayCount, totalBytes: totalBytes[0]?.total || 0, byType,
    };
  } catch { return { total: 0, todayCount: 0, totalBytes: 0, byType: [] }; }
}

/**
 * GET /api/admin/analytics/dashboard
 * Aggregated analytics for all 5 categories + system health
 */
exports.getAdminAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hourAgo = new Date(now - 60 * 60 * 1000);

    const [
      totalUsers, activeToday, newThisWeek, totalFaqs, pendingContributions,
      allFaqs, allUsers, allClusters, allSubmissions,
      recentAudit, pendingQueue, answeredToday
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastActive: { $gte: hourAgo } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      FAQ.countDocuments({ status: 'published' }),
      ContributedFAQ.countDocuments({ status: 'pending' }),
      FAQ.find({}, 'viewCount category createdAt').sort({ viewCount: -1 }).limit(20).lean(),
      User.find({}, 'spurtiPoints pizzaSlices createdAt lastActive role questionCount').sort({ spurtiPoints: -1 }).limit(20).lean(),
      SemanticCluster.find({}, 'canonicalQuestion createdAt status').sort({ createdAt: -1 }).limit(20).lean(),
      Submission.find({}, 'createdAt status').sort({ createdAt: -1 }).lean(),
      AuditLog.find().sort({ timestamp: -1 }).limit(100).lean(),
      SemanticCluster.countDocuments({ status: 'ADMIN_REVIEW' }),
      AuditLog.countDocuments({ action: 'USER_BANNED', timestamp: { $gte: todayStart } }),
    ]);

    // ── Peak Usage Hours ──────────────────────────────────────────────────────
    // Build a 24-hour histogram from submissions + clusters + logins
    const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
      hour: i, label: `${i.toString().padStart(2,'0')}:00`,
      questions: 0, discussions: 0, logins: 0, total: 0
    }));
    const recentActivity = [
      ...allSubmissions.filter(s => s.createdAt && s.createdAt >= weekStart),
      ...allClusters.filter(c => c.createdAt && c.createdAt >= weekStart),
    ];
    for (const item of recentActivity) {
      const h = new Date(item.createdAt).getHours();
      const bucket = hourBuckets[h];
      if ('canonicalQuestion' in item) bucket.discussions++;
      else bucket.questions++;
      bucket.total++;
    }
    // Estimate peak from hour buckets
    const peakHour = hourBuckets.reduce((max, h) => h.total > max.total ? h : max, hourBuckets[0]);
    const avgHourly = Math.round(hourBuckets.reduce((s, h) => s + h.total, 0) / 24) || 1;

    // ── Most Active Users (by SP) ─────────────────────────────────────────────
    const mostActiveUsers = allUsers.slice(0, 5).map(u => ({
      id: u._id, email: u.email, sp: u.spurtiPoints || 0,
      pizza: u.pizzaSlices || 0, questions: u.questionCount || 0,
      isAdmin: u.role === 'admin',
    }));

    // ── Most Viewed FAQ ───────────────────────────────────────────────────────
    const mostViewedFaq = allFaqs[0] || null;

    // ── Most Asked Category ───────────────────────────────────────────────────
    const catCounts = {};
    for (const f of allFaqs) { if (f.category) { catCounts[f.category] = (catCounts[f.category] || 0) + 1; } }
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const mostAskedCategory = sortedCats[0] || ['General', 0];

    // ── Most Questions Asked (users by questionCount) ─────────────────────────
    const topQuestionAskers = [...allUsers].sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0)).slice(0, 5).map(u => ({
      id: u._id, email: u.email, count: u.questionCount || 0,
    }));

    // ── Most FAQs Approved (by published FAQ count) ───────────────────────────
    const topFaqAuthors = {};
    for (const f of allFaqs) { if (f.authorId) { topFaqAuthors[f.authorId] = (topFaqAuthors[f.authorId] || 0) + 1; } }
    const topAuthorEntries = Object.entries(topFaqAuthors).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topAuthorIds = topAuthorEntries.map(([id]) => id);
    const authorDocs = await User.find({ _id: { $in: topAuthorIds } }).select('email').lean();
    const authorMap = Object.fromEntries(authorDocs.map(a => [a._id.toString(), a.email]));
    const mostFaqApproved = topAuthorEntries.map(([id, count]) => ({
      id, email: authorMap[id] || id, count,
    }));

    // ── Top Contributors (by audit log activity) ─────────────────────────────
    const adminActionCounts = {};
    for (const entry of recentAudit) {
      if (entry.adminId) {
        const key = entry.adminId.toString();
        adminActionCounts[key] = (adminActionCounts[key] || 0) + 1;
      }
    }
    const topContributorsEntries = Object.entries(adminActionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topContributorIds = topContributorsEntries.map(([id]) => id);
    const contributorDocs = await User.find({ _id: { $in: topContributorIds } }).select('email').lean();
    const contributorMap = Object.fromEntries(contributorDocs.map(a => [a._id.toString(), a.email]));
    const topContributors = topContributorsEntries.map(([id, count]) => ({
      id, email: contributorMap[id] || id, actions: count,
    }));

    // ── Most Searched Keywords ────────────────────────────────────────────────
    const keywordDocs = await SearchAnalytics.find({}).sort({ count: -1 }).limit(10).lean();
    const mostSearched = keywordDocs.map(k => ({ keyword: k.query || k.keyword, count: k.count || 0 }));

    // ── Duplicate Questions Detected ─────────────────────────────────────────
    const duplicateClusters = await Cluster.countDocuments({
      canonicalQuestion: { $exists: true, $ne: '' },
    });

    // ── Unanswered Questions ─────────────────────────────────────────────────
    const unanswered = await Cluster.countDocuments({
      $or: [{ canonicalAnswer: { $exists: false } }, { canonicalAnswer: '' }],
    });

    // ── User Growth Trend ────────────────────────────────────────────────────
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - i);
      const next = new Date(d); next.setMonth(next.getMonth() + 1);
      const count = await User.countDocuments({ createdAt: { $gte: d, $lt: next } });
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push({ label, count });
    }

    // ── Returning Users (users who logged in after their creation day) ───────
    const returningUsers = await User.countDocuments({
      lastActive: { $exists: true },
      $expr: { $gt: [{ $dayOfMonth: '$lastActive' }, { $dayOfMonth: '$createdAt' }] },
    });

    // ── System Health ────────────────────────────────────────────────────────
    let apiStatus = 'operational', dbStatus = 'operational', wsStatus = 'unknown', storageStatus = 'operational';
    try {
      await User.findOne({}, { _id: 1 }).lean();
      dbStatus = 'operational';
    } catch { dbStatus = 'degraded'; }
    try {
      const { execSync } = require('child_process');
      const size = execSync(`du -sm /Users/animeshpathak/ocfaqproj/faq-website/backend/data 2>/dev/null | cut -f1`, { encoding: 'utf8' });
      const mb = parseInt(size.trim(), 10);
      storageStatus = mb > 900 ? 'degraded' : 'operational';
    } catch { storageStatus = 'unknown'; }

    const analytics = {
      // Section 2: Admin Analytics
      totalUsers, activeUsersToday: activeToday, questionsToday: recentAudit.length,
      faqsPublished: totalFaqs, pendingContributions,
      // Section 3: User Demographics
      peakUsageHours: hourBuckets,
      peakHour: { hour: peakHour.hour, label: peakHour.label },
      mostActiveUsers,
      newUsersThisWeek: newThisWeek,
      returningUsers,
      userGrowthTrend: months,
      // Section 4: Contributor Analytics
      mostQuestionsAsked: topQuestionAskers,
      mostFaqsApproved: mostFaqApproved,
      topContributors,
      // Section 5: Knowledge Base Intelligence
      mostViewedFaq: mostViewedFaq ? { id: mostViewedFaq._id, question: mostViewedFaq.canonicalQuestion || 'Untitled', views: mostViewedFaq.viewCount || 0 } : null,
      mostAskedCategory: { name: mostAskedCategory[0], count: mostAskedCategory[1] },
      mostSearchedKeywords: mostSearched,
      unansweredQuestions: unanswered,
      duplicateQuestionsDetected: duplicateClusters,
      // Section 6: System Health
      systemHealth: { api: apiStatus, database: dbStatus, websocket: wsStatus, storage: storageStatus },
      // Section 7: Media & Attachments
      mediaAnalytics: await getMediaAnalytics(),
    };

    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
