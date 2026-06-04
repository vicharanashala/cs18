/**
 * boostController.js
 *
 * Handles two features:
 *  1. Boost         — costs 1 Pizza Slice, lasts 10 min, visibility push
 *  2. Convert to GT — upgrades an existing ticket to a Golden Ticket
 *
 * Both are entirely additive; the existing Golden Ticket creation flow is
 * untouched.
 */

const SemanticCluster  = require('../models/SemanticCluster');
const PersonalTicket   = require('../models/PersonalTicket');
const User             = require('../models/User');
const AuditLog         = require('../models/AuditLog');
const { recordTransaction } = require('../utils/walletHelper');
const { create: createNotification } = require('../services/notification.service');

// ─── Constants ────────────────────────────────────────────────────────────────
const BOOST_COST_SLICES    = 1;
const BOOST_DURATION_MS    = 10 * 60 * 1000;   // 10 minutes
const GT_COOLDOWN_MS       = 48 * 60 * 60 * 1000; // 48 hours (matches existing GT)

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Returns true when the cluster is currently boosted and not expired. */
function isClusterBoosted(cluster) {
  return !!(cluster.boostedUntil && new Date(cluster.boostedUntil) > new Date());
}

/** Returns true when the personal ticket is currently boosted and not expired. */
function isTicketBoosted(ticket) {
  return !!(ticket.boostedUntil && new Date(ticket.boostedUntil) > new Date());
}

/**
 * Normalise a cluster into the shape the frontend ClusterCard expects.
 * Safe to call on both boosted and non-boosted clusters.
 */
function normaliseCluster(cluster, isActive) {
  const boostedUntil = cluster.boostedUntil ? new Date(cluster.boostedUntil) : null;
  const boostedMs    = boostedUntil ? Math.max(0, boostedUntil.getTime() - Date.now()) : 0;
  const boostedSecs  = Math.floor(boostedMs / 1000);
  const boostedMins  = Math.floor(boostedSecs / 60);
  const boostedLeft  = boostedMs > 0
    ? `${boostedMins}m ${boostedSecs % 60}s`
    : null;

  return {
    _id:             cluster._id,
    question:        cluster.canonicalQuestion || cluster.originalQuestion || '',
    context:         cluster.context            || '',
    category:        cluster.category           || '',
    hashtags:        cluster.hashtags           || [],
    submissionsCount: cluster.submissionsCount  || 0,
    answerCount:     cluster.answerCount        || 0,
    status:          cluster.status,
    createdAt:       cluster.createdAt,
    isBoosted:       isActive,
    boostedUntil:    boostedLeft,
    boostedAt:       cluster.boostedAt          || null,
    participants:    cluster.participants       || [],
    relatedQueries:  cluster.relatedQueries     || [],
    _groupedCount:   1,
    _groupedVariants: [],
  };
}

// ─── BOOST a cluster (Once Asked Question) ───────────────────────────────────

/**
 * POST /api/boost/cluster/:id
 * Body: { } (no parameters needed; cost is fixed at 1 pizza slice)
 *
 * Rules:
 *  • caller must own at least one submission in the cluster (is a participant)
 *  • cluster must not be resolved/closed/rejected
 *  • no active boost already on this cluster
 *  • deduct 1 pizza slice immediately
 */
exports.boostCluster = async (req, res, next) => {
  try {
    const cluster = await SemanticCluster.findById(req.params.id);
    if (!cluster) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Must not be resolved/closed/rejected
    if (['CLOSED', 'REJECTED'].includes(cluster.status)) {
      return res.status(400).json({ success: false, message: 'Cannot boost a resolved question.' });
    }

    // No existing active boost
    if (isClusterBoosted(cluster)) {
      const remaining = Math.max(0, new Date(cluster.boostedUntil).getTime() - Date.now());
      const mins = Math.floor(remaining / 60000);
      return res.status(400).json({
        success: false,
        message: `Boost already active. Expires in ${mins} minute${mins !== 1 ? 's' : ''}.`,
      });
    }

    // Caller must be a participant (submitted a question in this cluster)
    const isParticipant = cluster.participants?.some(
      p => p.userId?.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You can only boost questions you have joined.' });
    }

    // Deduct pizza slice
    const user = await User.findById(req.user.id);
    if (user.pizzaSlices < BOOST_COST_SLICES) {
      return res.status(400).json({
        success: false,
        message: `Not enough pizza slices. You need ${BOOST_COST_SLICES} slice to boost.`,
        pizzaSlices: user.pizzaSlices,
      });
    }

    // Record transaction first (validates balance)
    await recordTransaction({
      userId:      req.user.id,
      type:        'BOOST_ACTIVATED',
      amount:      BOOST_COST_SLICES,
      direction:   'debit',
      description: `🚀 Boosted: "${(cluster.canonicalQuestion || '').slice(0, 60)}"`,
      metadata:    { pizzaSlicesSpent: BOOST_COST_SLICES, clusterId: cluster._id.toString() },
      tags:        ['boost', 'pizza'],
    });

    // Apply boost
    const now        = new Date();
    const boostedUntil = new Date(now.getTime() + BOOST_DURATION_MS);
    cluster.boostedAt    = now;
    cluster.boostedUntil = boostedUntil;
    await cluster.save();

    // Send notification
    await createNotification({
      userId:   req.user.id,
      type:     'BOOST_ACTIVATED',
      title:    '🚀 Your question has been boosted!',
      message:  `Your question is now on top of the feed for 10 minutes. Boost expires at ${boostedUntil.toLocaleTimeString()}.`,
      priority: 'normal',
      metadata: { clusterId: cluster._id.toString(), boostedUntil: boostedUntil.toISOString() },
    });

    return res.json({
      success:     true,
      message:     'Boost activated for 10 minutes.',
      boostedUntil: boostedUntil.toISOString(),
      boostedAt:   now.toISOString(),
      pizzaSlices: (await User.findById(req.user.id)).pizzaSlices,
    });

  } catch (err) {
    next(err);
  }
};

// ─── BOOST a personal ticket ──────────────────────────────────────────────────

/**
 * POST /api/boost/ticket/:id
 * Body: { } (cost fixed at 1 pizza slice)
 *
 * Rules mirror cluster boost:
 *  • caller must own the personal ticket
 *  • ticket must not be resolved/rejected
 *  • no existing active boost
 *  • deduct 1 pizza slice immediately
 */
exports.boostTicket = async (req, res, next) => {
  try {
    const ticket = await PersonalTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Must own the ticket
    if (ticket.userId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only boost your own tickets.' });
    }

    // Must not be resolved/rejected
    if (['resolved', 'rejected'].includes(ticket.status)) {
      return res.status(400).json({ success: false, message: 'Cannot boost a resolved ticket.' });
    }

    // No existing active boost
    if (isTicketBoosted(ticket)) {
      const remaining = Math.max(0, new Date(ticket.boostedUntil).getTime() - Date.now());
      const mins = Math.floor(remaining / 60000);
      return res.status(400).json({
        success: false,
        message: `Boost already active. Expires in ${mins} minute${mins !== 1 ? 's' : ''}.`,
      });
    }

    const user = await User.findById(req.user.id);
    if (user.pizzaSlices < BOOST_COST_SLICES) {
      return res.status(400).json({
        success: false,
        message: `Not enough pizza slices. You need ${BOOST_COST_SLICES} slice to boost.`,
        pizzaSlices: user.pizzaSlices,
      });
    }

    await recordTransaction({
      userId:      req.user.id,
      type:        'BOOST_ACTIVATED',
      amount:      BOOST_COST_SLICES,
      direction:   'debit',
      description: `🚀 Boosted ticket: "${(ticket.question || '').slice(0, 60)}"`,
      metadata:    { pizzaSlicesSpent: BOOST_COST_SLICES, ticketId: ticket._id.toString() },
      tags:        ['boost', 'pizza'],
    });

    const now         = new Date();
    const boostedUntil = new Date(now.getTime() + BOOST_DURATION_MS);
    ticket.boostedAt    = now;
    ticket.boostedUntil = boostedUntil;
    await ticket.save();

    await createNotification({
      userId:   req.user.id,
      type:     'BOOST_ACTIVATED',
      title:    '🚀 Your ticket has been boosted!',
      message:  `Your ticket is now more visible for 10 minutes. Expires at ${boostedUntil.toLocaleTimeString()}.`,
      priority: 'normal',
      metadata: { ticketId: ticket._id.toString(), boostedUntil: boostedUntil.toISOString() },
    });

    // Audit log — boost activated
    AuditLog.create({
      adminId:    req.user.id,
      adminEmail: req.user.email || `${req.user.id}@boost-action`,
      action:     'TICKET_BOOSTED',
      targetType: 'PersonalTicket',
      targetId:   ticket._id,
      targetLabel: (ticket.question || '').slice(0, 80),
      metadata:   { boostedUntil: boostedUntil.toISOString(), pizzaSlicesSpent: BOOST_COST_SLICES },
    }).catch(err => console.error('[AUDIT ERROR boostTicket]', err.message));

    // Audit log — pizza slice spent
    AuditLog.create({
      adminId:    req.user.id,
      adminEmail: req.user.email || `${req.user.id}@boost-action`,
      action:     'PIZZA_SLICE_SPENT',
      targetType: 'PersonalTicket',
      targetId:   ticket._id,
      targetLabel: (ticket.question || '').slice(0, 80),
      metadata:   { amount: BOOST_COST_SLICES, reason: 'boost', ticketId: ticket._id.toString() },
    }).catch(err => console.error('[AUDIT ERROR boostTicket pizza]', err.message));

    return res.json({
      success:      true,
      message:      'Boost activated for 10 minutes.',
      boostedUntil: boostedUntil.toISOString(),
      boostedAt:    now.toISOString(),
      pizzaSlices:  (await User.findById(req.user.id)).pizzaSlices,
    });

  } catch (err) {
    next(err);
  }
};

// ─── CONVERT a personal ticket to a Golden Ticket ────────────────────────────

/**
 * POST /api/boost/convert-to-golden/:ticketId
 * Body: { spurtiSpent: number }  (required, min 1 SP)
 *
 * Rules:
 *  • caller must own the personal ticket
 *  • ticket must not already be resolved/rejected
 *  • ticket must not already be a Golden Ticket (PersonalTicket has no GT flag,
 *    but we guard against double-conversion via a metadata flag)
 *  • user must have GT eligibility (cooldown check)
 *  • deduct SP immediately (via recordTransaction)
 *
 * NOTE: The converted ticket becomes a full GoldenTicket document. The
 * PersonalTicket is left in-tact but marked converted.
 */
exports.convertToGoldenTicket = async (req, res, next) => {
  try {
    const { spurtiSpent } = req.body;

    if (!spurtiSpent || spurtiSpent < 1) {
      return res.status(400).json({ success: false, message: 'Invalid SP amount. Minimum 1 SP required.' });
    }

    const personalTicket = await PersonalTicket.findById(req.params.ticketId);
    if (!personalTicket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Must own it
    if (personalTicket.userId?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only convert your own tickets.' });
    }

    // Must not be resolved/rejected
    if (['resolved', 'rejected'].includes(personalTicket.status)) {
      return res.status(400).json({ success: false, message: 'Cannot convert a resolved or rejected ticket.' });
    }

    // Must not already be converted
    if (personalTicket.isConvertedToGT) {
      return res.status(400).json({ success: false, message: 'Ticket is already a Golden Ticket.' });
    }

    // Check GT cooldown
    const user = await User.findById(req.user.id);
    if (user.goldenTicketCooldownUntil && new Date(user.goldenTicketCooldownUntil) > new Date()) {
      return res.status(403).json({ success: false, message: 'Golden Ticket cooldown is active. Please wait before creating another.' });
    }

    // Check no active GT already
    const GoldenTicket = require('../models/GoldenTicket');
    const existingGT = await GoldenTicket.findOne({ createdBy: req.user.id, status: 'active' });
    if (existingGT) {
      return res.status(403).json({ success: false, message: 'You already have an active Golden Ticket. Only one active GT at a time.' });
    }

    // Check SP balance
    if (user.spurtiPoints < spurtiSpent) {
      return res.status(400).json({ success: false, message: 'Insufficient Spurti Points.' });
    }

    // ── Create the Golden Ticket ──────────────────────────────────────────────
    const gt = await GoldenTicket.create({
      title:     personalTicket.question,
      context:   personalTicket.context,
      createdBy: personalTicket.userId,
      spurtiSpent,
    });

    // ── Deduct SP + set GT cooldown ───────────────────────────────────────────
    await recordTransaction({
      userId:      personalTicket.userId,
      type:        'golden_ticket_creation',
      amount:      spurtiSpent,
      direction:   'debit',
      description: `Golden Ticket conversion — "${personalTicket.question}"`,
      metadata:    { ticketId: gt._id.toString(), personalTicketId: personalTicket._id.toString(), spurtiSpent },
      tags:        ['golden_ticket', 'sp_spent'],
    });

    user.goldenTicketCooldownUntil = new Date(Date.now() + GT_COOLDOWN_MS);
    await user.save();

    // ── Mark personal ticket as converted ─────────────────────────────────────
    personalTicket.isConvertedToGT = true;
    personalTicket.goldenTicketId  = gt._id;
    personalTicket.status          = 'under_review';   // reflects GT conversion
    await personalTicket.save();

    // ── Notification ───────────────────────────────────────────────────────────
    await createNotification({
      userId:   personalTicket.userId,
      type:     'GOLDEN_TICKET_CREATED',
      title:    '⭐ Ticket converted to Golden Ticket!',
      message:  `Your question has been upgraded to a Golden Ticket with ${spurtiSpent} SP priority.`,
      priority: 'high',
      metadata: {
        goldenTicketId:    gt._id.toString(),
        personalTicketId:  personalTicket._id.toString(),
        spurtiSpent,
      },
    });

    // Audit log — converted to golden ticket
    AuditLog.create({
      adminId:    req.user.id,
      adminEmail: req.user.email || `${req.user.id}@convert-action`,
      action:     'TICKET_CONVERTED_TO_GOLDEN',
      targetType: 'PersonalTicket',
      targetId:   personalTicket._id,
      targetLabel: (personalTicket.question || '').slice(0, 80),
      metadata:   {
        goldenTicketId: gt._id.toString(),
        spurtiSpent,
        personalTicketId: personalTicket._id.toString(),
      },
    }).catch(err => console.error('[AUDIT ERROR convertToGT]', err.message));

    // Audit log — SP spent
    AuditLog.create({
      adminId:    req.user.id,
      adminEmail: req.user.email || `${req.user.id}@convert-action`,
      action:     'SPURTI_SPENT',
      targetType: 'GoldenTicket',
      targetId:   gt._id,
      targetLabel: (personalTicket.question || '').slice(0, 80),
      metadata:   { amount: spurtiSpent, reason: 'golden_ticket_conversion' },
    }).catch(err => console.error('[AUDIT ERROR convertToGT spurti]', err.message));

    return res.status(201).json({
      success:       true,
      message:       'Ticket converted to Golden Ticket.',
      goldenTicket:  gt,
      pizzaSlices:   (await User.findById(req.user.id)).pizzaSlices,
      spurtiPoints:  (await User.findById(req.user.id)).spurtiPoints,
    });

  } catch (err) {
    next(err);
  }
};

// ─── BACKGROUND CLEANUP: expire stale boosts ──────────────────────────────────

/**
 * Called periodically (e.g. every minute by a cron or on each getClusters call).
 * Sets isBoosted = false / clears boostedUntil for any overdue documents.
 *
 * In production: call this from a cron job (e.g. node-cron).
 * For now we call it at the top of getClusters so it auto-runs on feed access.
 */
exports.cleanupExpiredBoosts = async () => {
  try {
    const now = new Date();

    const [clusterResult, ticketResult] = await Promise.all([
      SemanticCluster.updateMany(
        { boostedUntil: { $lt: now } },
        { $set: { boostedUntil: null, boostedAt: null } }
      ),
      PersonalTicket.updateMany(
        { boostedUntil: { $lt: now } },
        { $set: { boostedUntil: null, boostedAt: null } }
      ),
    ]);

    if (clusterResult.modifiedCount > 0 || ticketResult.modifiedCount > 0) {
      console.log(`[BOOST CLEANUP] clusters=${clusterResult.modifiedCount} tickets=${ticketResult.modifiedCount}`);
    }
    return { clusters: clusterResult.modifiedCount, tickets: ticketResult.modifiedCount };
  } catch (err) {
    console.error('[BOOST CLEANUP ERROR]', err);
    return { clusters: 0, tickets: 0 };
  }
};