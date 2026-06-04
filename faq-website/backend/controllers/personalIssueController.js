const SolvedPersonalIssue = require('../models/SolvedPersonalIssue');
const PersonalTicket = require('../models/PersonalTicket');
const User = require('../models/User');
const { extractPersonalIntent } = require('../utils/intentExtractor');
const getEmbedding = require('../utils/embedding');
const { cosineSimilarity } = require('../utils/clustering');
const ticketService = require('../services/ticket.service');
const { calculateSeverity } = require('../utils/severityEngine');

// STEP 1, 2, 3: Resolve Personal Issue (Deterministic Deflection & Duplicate Detection)
exports.resolvePersonalIssue = async (req, res) => {
  try {
    const { question, context, category: reqCategory, customCategory: reqCustomCategory } = req.body;

    if (!question || !context) {
      return res.status(400).json({ error: 'Question and context are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const institution = user.institution || 'General';

    // 1. Prepare deterministic matching keywords
    const combinedText = (question + ' ' + context).toLowerCase();
    const individualWords = combinedText.split(/\s+/).filter(w => w.length > 3);

    // 2. Fetch potential deflections and duplicates
    const [faqs, discussions, recentTickets] = await Promise.all([
      require('../models/FAQ').find().lean(),
      require('../models/SemanticCluster').find({ status: { $in: ['CLOSED', 'PROMOTED'] } }).lean(),
      PersonalTicket.find({ 
        institution: { $regex: new RegExp(`^${institution}$`, 'i') },
        status: 'resolved',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).lean()
    ]);

    const scoreItem = (item, textToMatch) => {
      let score = 0;
      const targetText = textToMatch.toLowerCase();
      individualWords.forEach(w => {
        if (targetText.includes(w)) score += 10;
      });
      if (item.hashtags) {
        item.hashtags.forEach(tag => {
          if (combinedText.includes(tag.toLowerCase())) score += 20;
        });
      }
      return score;
    };

    // Score FAQs
    const scoredFaqs = faqs.map(f => ({
      _id: f._id,
      type: 'faq',
      question: f.question,
      answer: f.answer,
      similarity: scoreItem(f, f.question + ' ' + f.answer)
    })).filter(f => f.similarity >= 20);

    // Score Discussions
    const scoredDiscussions = discussions.map(d => ({
      _id: d._id,
      type: 'discussion',
      question: d.canonicalQuestion,
      answer: d.aiGeneratedAnswer || d.context,
      similarity: scoreItem(d, d.canonicalQuestion + ' ' + d.context)
    })).filter(d => d.similarity >= 20);

    // Score Tickets
    const scoredTickets = recentTickets.map(t => ({
      _id: t._id,
      type: 'ticket',
      question: t.question,
      answer: t.resolvedAnswer,
      similarity: scoreItem(t, t.question + ' ' + t.context)
    })).filter(t => t.similarity >= 20);

    // Combine and sort
    const allMatches = [...scoredFaqs, ...scoredDiscussions, ...scoredTickets]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Top 3

    if (allMatches.length > 0) {
      // HIGH/MEDIUM Confidence matching found
      return res.json({
        status: allMatches[0].similarity > 40 ? 'HIGH' : 'MEDIUM',
        normalizedIntent: question,
        category: reqCategory,
        matches: allMatches.map(m => ({
          _id: m._id,
          type: m.type,
          normalizedIntent: m.question,
          verifiedAnswer: m.answer,
          similarity: m.similarity
        }))
      });
    } else {
      // LOW Confidence: auto-escalate directly
      let priorityScore = 0;
      const urgencyKeywords = ['urgent', 'immediately', 'stuck', 'please help', 'unable', 'failing', 'critical', 'emergency'];
      urgencyKeywords.forEach(kw => {
        if (combinedText.includes(kw)) priorityScore += 10;
      });

      const ticket = new PersonalTicket({
        userId: req.user.id,
        question,
        context,
        category: reqCategory || 'General',
        customCategory: reqCustomCategory,
        institution,
        status: 'submitted',
        normalizedIntent: question,
        priorityScore,
        attachments: req.body.attachments || []
      });
      const severity = calculateSeverity(ticket);
      ticket.severityScore = severity.severityScore;
      ticket.priorityLevel = severity.priorityLevel;
      ticket.severityBreakdown = severity.severityBreakdown;
      await ticket.save();

      // Generate Tracker Ticket
      const ticketService = require('../services/ticket.service');
      const ticketNumber = await ticketService.createTicket(req.user.id, question, 'personal', ticket._id, reqCategory || 'General', Math.min(100, priorityScore * 1.5));

      return res.json({
        status: 'LOW',
        message: "This appears to be a new issue. It has been escalated to an admin.",
        ticketId: ticket._id,
        ticketNumber,
        normalizedIntent: question,
        category: reqCategory
      });
    }
  } catch (err) {
    console.error('Resolve personal issue failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// Escalate Personal Issue (Used when student confirms escalation)
exports.escalatePersonalIssue = async (req, res) => {
  try {
    const { question, context, category, customCategory, normalizedIntent } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Feature 10: Smart Escalation Priority Score
    let priorityScore = 0;
    const combinedText = (question + ' ' + context).toLowerCase();
    const urgencyKeywords = ['urgent', 'immediately', 'stuck', 'please help', 'unable', 'failing', 'critical', 'emergency'];
    urgencyKeywords.forEach(kw => {
      if (combinedText.includes(kw)) priorityScore += 10;
    });

    const ticket = new PersonalTicket({
      userId: req.user.id,
      question,
      context,
      category: category || 'General',
      customCategory,
      institution: user.institution || 'General',
      status: 'submitted',
      normalizedIntent: question,
      priorityScore,
      attachments: req.body.attachments || []
    });
    const severity = calculateSeverity(ticket);
    ticket.severityScore = severity.severityScore;
    ticket.priorityLevel = severity.priorityLevel;
    ticket.severityBreakdown = severity.severityBreakdown;
    await ticket.save();

    // Generate Tracker Ticket
    const ticketService = require('../services/ticket.service');
    const ticketNumber = await ticketService.createTicket(req.user.id, question, 'personal', ticket._id, category || 'General', Math.min(100, priorityScore * 1.5));

    res.json({
      message: 'Escalated to an admin successfully. You will receive a response within 24 hours.',
      ticketId: ticket._id,
      ticketNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Feedback correction loop / Collision detection
exports.feedbackPersonalIssue = async (req, res) => {
  try {
    const { matchId, type, helpful, question, context, normalizedIntent, category, customCategory } = req.body;

    if (helpful) {
      // Feature 6: AI Ticket Deflection Tracking
      const DeflectionAnalytics = require('../models/DeflectionAnalytics');
      const payload = {
        originalQuery: question,
        category,
        sessionId: req.headers['x-session-id'] || req.ip,
        userId: req.user.id
      };
      if (type === 'faq') payload.deflectedByFaqId = matchId;
      else if (type === 'discussion') payload.deflectedByDiscussionId = matchId;
      else if (type === 'ticket') payload.deflectedByTicketId = matchId;

      await DeflectionAnalytics.create(payload);
      return res.json({ success: true, message: 'Feedback recorded.' });
    } else {
      // Escalate to admin since match was not helpful
      const user = await User.findById(req.user.id);
      
      // Feature 10: Priority score calculation
      let priorityScore = 15; // Base bump for failed resolution
      const combinedText = (question + ' ' + (context || '')).toLowerCase();
      const urgencyKeywords = ['urgent', 'immediately', 'stuck', 'please help', 'unable', 'failing', 'critical', 'emergency'];
      urgencyKeywords.forEach(kw => {
        if (combinedText.includes(kw)) priorityScore += 10;
      });

      const ticket = new PersonalTicket({
        userId: req.user.id,
        question,
        context,
        category: category || 'General',
        customCategory,
        institution: user?.institution || 'General',
        status: 'submitted',
        normalizedIntent: normalizedIntent || question,
        quirks: `Deflection Failed for matched ID: ${matchId} (Type: ${type})`,
        priorityScore,
        attachments: req.body.attachments || []
      });
      const severity = calculateSeverity(ticket);
      ticket.severityScore = severity.severityScore;
      ticket.priorityLevel = severity.priorityLevel;
      ticket.severityBreakdown = severity.severityBreakdown;
      await ticket.save();

      // Generate Tracker Ticket
      const ticketService = require('../services/ticket.service');
      const ticketNumber = await ticketService.createTicket(req.user.id, question, 'personal', ticket._id, category || 'General', Math.min(100, priorityScore * 1.5));

      res.json({
        message: 'Your ticket has been escalated to an admin due to resolution mismatch.',
        ticketId: ticket._id,
        ticketNumber
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get Personal Issue by ID
exports.getPersonalIssue = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const ticket = await PersonalTicket.findOne({ _id: ticketId, userId: req.user.id }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Fetch the linked ticket to get the tracking number
    const tracker = await require('../models/Ticket').findOne({ referenceId: ticket._id }).populate('assignedMentor', 'fullName username email');
    if (tracker) {
      ticket.ticketNumber = tracker.ticketNumber;
      ticket.trackerInfo = {
        autoRouted: tracker.autoRouted,
        routingReason: tracker.routingReason,
        assignedMentor: tracker.assignedMentor,
        assignedAt: tracker.assignedAt,
        acceptedAt: tracker.acceptedAt
      };
    }

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Appeal Personal Issue
exports.appealPersonalIssue = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const ticket = await PersonalTicket.findOne({ _id: ticketId, userId: req.user.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Ensure it's in a state that can be appealed
    if (ticket.status !== 'resolved' && ticket.status !== 'rejected') {
      return res.status(400).json({ error: 'Ticket must be resolved or rejected to appeal.' });
    }

    ticket.status = 'under_review';
    await ticket.save();

    res.json({ message: 'Ticket appealed successfully.', ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
