const Submission = require('../models/Submission');
const { deduplicateFeedItems } = require('../utils/searchUtils');
const Answer = require('../models/Answer');
const { findOrCreateCluster } = require('../utils/clustering');
const ticketService = require('../services/ticket.service');

const MAX_ANSWERS = 10;
const URGENT_HOURS = 3;

// ─── Urgency ──────────────────────────────────────────────────────────────────
async function recalcUrgency() {
  const SemanticCluster = require('../models/SemanticCluster');
  const stale = await SemanticCluster.find({
    status: 'OPEN',
    answerCount: { $lt: MAX_ANSWERS },
    $or: [{ isUrgent: false }, { isUrgent: { $exists: false } }],
  }).select('_id createdAt firstAnswerAt');

  const now = Date.now();
  for (const c of stale) {
    if ((now - c.createdAt) / 3_600_000 >= URGENT_HOURS) {
      await SemanticCluster.findByIdAndUpdate(c._id, { isUrgent: true });
    }
  }
}

// ─── Submit Ticket ─────────────────────────────────────────────────────────────
exports.submitTicket = async (req, res, next) => {
  try {
    const { question, context, category, customCategory, attachments } = req.body;
    console.log("Received ticket submission:", { question, context, category, customCategory, attachments: attachments?.length || 0 });

    if (!question || question.trim().split(/\s+/).length < 3)
      return res.status(400).json({ error: 'Question must be at least 3 words.' });
    if (!context || context.trim().split(/\s+/).length < 5)
      return res.status(400).json({ error: 'Context must be at least 5 words.' });
    if (category === 'Other' && (!customCategory || !customCategory.trim()))
      return res.status(400).json({ error: 'Please specify your custom category.' });

    // Try to find a matching cluster; create one if none match
    const { cluster, isNew, joinMethod, typedQuestion } = await findOrCreateCluster(
      question, context, req.user.id, 0.82, category, customCategory
    );

    if (isNew && attachments?.length > 0) {
      cluster.attachments = attachments;
      await cluster.save();
    }

    const existingSub = await Submission.findOne({ clusterId: cluster._id, userId: req.user.id });
    let newSubmission = null;

    if (!existingSub) {
      newSubmission = new Submission({
        userId: req.user.id,
        clusterId: cluster._id,
        question,
        context,
        category,
        customCategory,
        attachments: attachments || [],
      });
      await newSubmission.save();
    }

    if (!isNew) {
      // Merge: add user to cluster if not already there
      const alreadyJoined = cluster.participants.some(
        p => p.userId.toString() === req.user.id
      );
      if (!alreadyJoined) {
        cluster.participants.push({
          userId: req.user.id,
          joinedAt: new Date(),
          joinMethod,
          question: typedQuestion,
        });
      }
      // Also record in relatedQueries so we can show their typed variant
      const alreadyRelated = cluster.relatedQueries?.some(
        r => r.userId.toString() === req.user.id
      );
      if (!alreadyRelated) {
        cluster.relatedQueries = cluster.relatedQueries || [];
        cluster.relatedQueries.push({
          userId: req.user.id,
          question: typedQuestion,
          joinedAt: new Date(),
          joinMethod,
        });
      }
      cluster.submissionsCount = (cluster.submissionsCount || 0) + 1;
      await cluster.save();
    }

    const ticketNumber = await ticketService.createTicket(
      req.user.id, question, 'general',
      existingSub?._id || newSubmission?._id, category, 0
    );

    res.json({
      message: 'Ticket submitted successfully and mapped to discussion cluster.',
      clusterId: cluster._id,
      ticketNumber,
      wasAutoMerged: !isNew,
    });
  } catch (err) {
    console.error("Error submitting ticket:", err);
    next(err);
  }
};

// ─── Join Cluster ─────────────────────────────────────────────────────────────
exports.joinCluster = async (req, res, next) => {
  try {
    const SemanticCluster = require('../models/SemanticCluster');
    const cluster = await SemanticCluster.findById(req.params.id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found.' });

    if (cluster.creatorId?.toString() === req.user.id)
      return res.status(400).json({ error: 'You are the creator of this ticket. You cannot join it.' });

    const alreadyJoined = cluster.participants?.some(
      p => p.userId.toString() === req.user.id
    );
    if (alreadyJoined)
      return res.status(400).json({ error: 'You have already joined this discussion.' });

    // Manual "Me too" join (distinct from auto-clustering)
    cluster.participants = cluster.participants || [];
    cluster.participants.push({
      userId: req.user.id,
      joinedAt: new Date(),
      joinMethod: 'MANUAL',
      question: cluster.canonicalQuestion,
    });
    cluster.submissionsCount = (cluster.submissionsCount || 0) + 1;
    await cluster.save();

    await new Submission({
      userId: req.user.id,
      clusterId: cluster._id,
      question: cluster.canonicalQuestion,
      context: "User joined via 'I have this question too' button.",
    }).save();

    res.json({
      message: 'Successfully joined discussion.',
      submissionsCount: cluster.submissionsCount,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Cluster ────────────────────────────────────────────────────────────
exports.deleteCluster = async (req, res, next) => {
  try {
    const SemanticCluster = require('../models/SemanticCluster');
    const cluster = await SemanticCluster.findById(req.params.id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found.' });

    if (!cluster.creatorId || cluster.creatorId.toString() !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized. Only the creator can delete this ticket.' });

    const nextOwner = cluster.participants.find(
      p => p.userId.toString() !== req.user.id
    );

    if (nextOwner) {
      const User = require('../models/User');
      const owner = await User.findById(nextOwner.userId);
      const ownerName = owner?.username || 'another user';

      cluster.creatorId = nextOwner.userId;
      cluster.participants = cluster.participants.filter(
        p => p.userId.toString() !== req.user.id
      );
      cluster.history.push({
        event: `Ownership transferred to @${ownerName}`,
        timestamp: new Date(),
      });
      await cluster.save();

      await Submission.deleteMany({ clusterId: cluster._id, userId: req.user.id });
      cluster.submissionsCount = Math.max(0, (cluster.submissionsCount || 1) - 1);
      await cluster.save();

      return res.json({ message: 'Discussion ownership transferred to another active participant.' });
    }

    await Submission.deleteMany({ clusterId: cluster._id });
    await Answer.deleteMany({ clusterId: cluster._id });
    await SemanticCluster.findByIdAndDelete(cluster._id);

    res.json({ message: 'Discussion deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Clusters ──────────────────────────────────────────────────────────
exports.getClusters = async (req, res, next) => {
  try {
    const SemanticCluster = require('../models/SemanticCluster');

    // ── Auto-cleanup expired boosts ──────────────────────────────────────────
    const now = new Date();
    await SemanticCluster.updateMany(
      { boostedUntil: { $lt: now } },
      { $set: { boostedUntil: null, boostedAt: null } }
    );

    await recalcUrgency();

    let clusters = await SemanticCluster.find({ status: 'OPEN' })
      .sort({ isUrgent: -1, boostedAt: -1, createdAt: -1 })
      .select('-embedding')
      .populate('participants.userId', '_id username email reputation')
      .populate('relatedQueries.userId', '_id username email reputation')
      .populate('attachments.uploadedBy', 'username email')
      .lean();

    // Attach variants count and ensure relatedQueries exists
    clusters = clusters.map(c => {
      const isActive = c.boostedUntil && new Date(c.boostedUntil) > now;
      const boostedUntil = c.boostedUntil ? new Date(c.boostedUntil) : null;
      const boostedMs    = boostedUntil ? Math.max(0, boostedUntil.getTime() - now.getTime()) : 0;
      const boostedSecs  = Math.floor(boostedMs / 1000);
      const boostedMins  = Math.floor(boostedSecs / 60);

      return {
        ...c,
        isBoosted:   isActive,
        boostedUntil: isActive && boostedMs > 0
          ? `${String(boostedMins).padStart(2, '0')}:${String(boostedSecs % 60).padStart(2, '0')}`
          : null,
        variantsCount: (c.relatedQueries || []).length,
        _groupedCount: 1,
        _groupedVariants: [],
      };
    });

    // Sort: boosted first (newest boostedAt first), then golden tickets, then normal
    clusters.sort((a, b) => {
      const aActive = a.isBoosted ? 2 : (a.status === 'ADMIN_REVIEW' ? 1 : 0);
      const bActive = b.isBoosted ? 2 : (b.status === 'ADMIN_REVIEW' ? 1 : 0);
      if (aActive !== bActive) return bActive - aActive;
      if (a.isBoosted && b.isBoosted) {
        // Most recently boosted first
        const aTime = a.boostedAt ? new Date(a.boostedAt).getTime() : 0;
        const bTime = b.boostedAt ? new Date(b.boostedAt).getTime() : 0;
        return bTime - aTime;
      }
      return 0;
    });

    // Deduplicate: collapse semantically near-identical questions into one card
    // using hybrid n-gram + token-overlap similarity
    const deduplicated = deduplicateFeedItems(clusters, 0.78);

    res.json({ clusters: deduplicated });
  } catch (err) {
    next(err);
  }
};

// ─── Get Urgent Clusters ───────────────────────────────────────────────────────
exports.getUrgentClusters = async (req, res, next) => {
  try {
    const SemanticCluster = require('../models/SemanticCluster');
    await recalcUrgency();

    const clusters = await SemanticCluster.find({ status: 'OPEN', isUrgent: true })
      .sort({ createdAt: 1 })
      .select('-embedding')
      .lean();

    res.json({ clusters });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Cluster ────────────────────────────────────────────────────────
exports.getClusterById = async (req, res, next) => {
  try {
    const SemanticCluster = require('../models/SemanticCluster');
    const cluster = await SemanticCluster.findById(req.params.id)
      .select('-embedding')
      .populate('participants.userId', '_id username email reputation')
      .populate('relatedQueries.userId', '_id username email reputation')
      .populate('attachments.uploadedBy', 'username email')
      .lean();

    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const userId = req.user?.id;

    // Derive booleans
    cluster.isCreator = !!(
      userId && cluster.creatorId && cluster.creatorId.toString() === userId
    );

    cluster.hasJoined = !!(
      userId && cluster.participants?.some(p => p.userId?._id?.toString() === userId)
    );

    const answers = await Answer.find({ clusterId: req.params.id })
      .populate('userId', '_id email reputation')
      .populate('attachments.uploadedBy', 'username email')
      .lean();

    cluster.hasAnswered = !!(
      userId && answers.some(a => a.userId?._id?.toString() === userId)
    );

    const LOCK = 9;
    cluster.answerCount = answers.length;
    cluster.consensusLocked = answers.length >= LOCK;

    cluster.annotatedAnswers = answers.map(a => ({
      ...a,
      isOwner: !!(userId && a.userId?._id?.toString() === userId),
      consensusLocked: cluster.consensusLocked,
    }));

    const now       = new Date();
    const isBoosted = !!(cluster.boostedUntil && new Date(cluster.boostedUntil) > now);

    res.json({
      cluster,
      answers: cluster.annotatedAnswers,
      answerCount: cluster.answerCount,
      consensusLocked: cluster.consensusLocked,
      hasAnswered: cluster.hasAnswered,
      isBoosted,
      boostedUntil: isBoosted ? cluster.boostedUntil : null,
      boostedAt:    cluster.boostedAt    || null,
    });
  } catch (err) {
    next(err);
  }
};