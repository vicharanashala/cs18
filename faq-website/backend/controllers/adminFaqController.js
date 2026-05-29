const FAQ = require('../models/FAQ');
const { FAQ_CATEGORIES } = require('../utils/constants');
const getEmbedding = require('../utils/embedding');
const GoldenTicket = require('../models/GoldenTicket');
const ContributedFAQ = require('../models/ContributedFAQ');
const { recordTransaction } = require('../utils/walletHelper');

// ─── List & Search ─────────────────────────────────────────────────────────────

// GET /api/admin/faqs
exports.getFaqs = async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      status = '',          // 'active' | 'archived'
      sortBy = 'createdAt', // createdAt | viewCount | helpfulCount
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;

    if (status === 'archived') {
      filter.isArchived = true;
    } else if (status === 'active') {
      filter.isArchived = { $ne: true };
    }

    if (search.trim()) {
      const q = search.trim();
      filter.$or = [
        { question: { $regex: q, $options: 'i' } },
        { answer:   { $regex: q, $options: 'i' } },
        { hashtags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const total = await FAQ.countDocuments(filter);

    const faqs = await FAQ.find(filter)
      .select('question answer category hashtags viewCount publicViews helpfulCount notHelpfulCount isArchived isPinned isFeatured createdAt updatedAt needsReview wordCount')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, faqs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('getFaqs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Get Single ────────────────────────────────────────────────────────────────

// GET /api/admin/faqs/:id
exports.getFaq = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id).lean();
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Create ────────────────────────────────────────────────────────────────────

// POST /api/admin/faqs
exports.createFaq = async (req, res) => {
  try {
    const { question, answer, category, hashtags, isFeatured, isPinned } = req.body;

    if (!question?.trim())  return res.status(400).json({ success: false, error: 'Question is required' });
    if (!answer?.trim())    return res.status(400).json({ success: false, error: 'Answer is required' });
    if (!category)          return res.status(400).json({ success: false, error: 'Category is required' });
    if (!FAQ_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({ success: false, error: `Invalid category. Allowed: ${FAQ_CATEGORIES.join(', ')}` });
    }

    const embedding = await getEmbedding(question.trim());
    const text = `${question.trim()} ${answer.trim()}`;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const faq = new FAQ({
      question:   question.trim(),
      answer:     answer.trim(),
      category:   category.trim(),
      hashtags:   Array.isArray(hashtags) ? hashtags.map(t => t.trim()).filter(Boolean) : [],
      isFeatured: !!isFeatured,
      isPinned:   !!isPinned,
      embedding:  embedding || [],
      wordCount,
    });

    await faq.save();
    res.status(201).json({ success: true, faq });
  } catch (err) {
    console.error('createFaq error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Update ────────────────────────────────────────────────────────────────────

// PUT /api/admin/faqs/:id
exports.updateFaq = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });

    const { question, answer, category, hashtags, isFeatured, isPinned, status } = req.body;

    if (question !== undefined) {
      if (!question.trim()) return res.status(400).json({ success: false, error: 'Question cannot be empty' });
      faq.question = question.trim();
      // Regenerate embedding if question changed
      const newEmbedding = await getEmbedding(question.trim());
      if (newEmbedding && newEmbedding.length > 0) faq.embedding = newEmbedding;
    }

    if (answer !== undefined) {
      if (!answer.trim()) return res.status(400).json({ success: false, error: 'Answer cannot be empty' });
      faq.answer = answer.trim();
    }

    if (category !== undefined) {
      if (!FAQ_CATEGORIES.includes(category.trim())) {
        return res.status(400).json({ success: false, error: `Invalid category. Allowed: ${FAQ_CATEGORIES.join(', ')}` });
      }
      faq.category = category.trim();
    }

    if (hashtags !== undefined) {
      faq.hashtags = Array.isArray(hashtags) ? hashtags.map(t => t.trim()).filter(Boolean) : [];
    }

    if (isFeatured !== undefined) faq.isFeatured = !!isFeatured;
    if (isPinned   !== undefined) faq.isPinned   = !!isPinned;

    if (status === 'archived') {
      faq.isArchived = true;
    } else if (status === 'active') {
      faq.isArchived = false;
    }

    // Recompute wordCount if question or answer changed
    if (question !== undefined || answer !== undefined) {
      const text = `${faq.question} ${faq.answer}`;
      faq.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    }

    await faq.save();
    res.json({ success: true, faq });
  } catch (err) {
    console.error('updateFaq error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Archive / Restore ─────────────────────────────────────────────────────────

// PATCH /api/admin/faqs/:id/archive
exports.archiveFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/admin/faqs/:id/restore
exports.restoreFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isArchived: false }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Pin / Feature ─────────────────────────────────────────────────────────────

// PATCH /api/admin/faqs/:id/pin
exports.pinFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isPinned: true }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/admin/faqs/:id/unpin
exports.unpinFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isPinned: false }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/admin/faqs/:id/feature
exports.featureFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isFeatured: true }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/admin/faqs/:id/unfeature
exports.unfeatureFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isFeatured: false }, { new: true });
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Delete (Hard) ─────────────────────────────────────────────────────────────

// DELETE /api/admin/faqs/:id
exports.deleteFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Bulk ──────────────────────────────────────────────────────────────────────

// PATCH /api/admin/faqs/bulk
// Body: { ids: string[], action: 'archive'|'restore'|'delete'|'pin'|'unpin'|'feature'|'unfeature' }
exports.bulkAction = async (req, res) => {
  try {
    const { ids = [], action } = req.body;
    if (!ids.length) return res.status(400).json({ success: false, error: 'No IDs provided' });

    let update;
    switch (action) {
      case 'archive':   update = { isArchived: true };  break;
      case 'restore':   update = { isArchived: false }; break;
      case 'pin':       update = { isPinned: true };    break;
      case 'unpin':     update = { isPinned: false };   break;
      case 'feature':   update = { isFeatured: true };  break;
      case 'unfeature': update = { isFeatured: false }; break;
      case 'delete':
        await FAQ.deleteMany({ _id: { $in: ids } });
        return res.json({ success: true, deleted: ids.length });
      default:
        return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    const result = await FAQ.updateMany({ _id: { $in: ids } }, update);
    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── FAQ Promotion from Knowledge Sources ──────────────────────────────────────

// POST /api/admin/faqs/promote-knowledge
// Body: { source: 'golden-ticket'|'contribution', sourceId, question, answer, category, tags }
exports.promoteKnowledge = async (req, res) => {
  try {
    const { source, sourceId, question, answer, category, tags } = req.body;

    if (!question?.trim())  return res.status(400).json({ success: false, error: 'Question is required' });
    if (!answer?.trim())    return res.status(400).json({ success: false, error: 'Answer is required' });
    if (!category)          return res.status(400).json({ success: false, error: 'Category is required' });
    if (!FAQ_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({ success: false, error: `Invalid category` });
    }

    // 1. Create the FAQ
    const embedding = await getEmbedding(question.trim());
    const text = `${question.trim()} ${answer.trim()}`;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const faq = new FAQ({
      question: question.trim(),
      answer:   answer.trim(),
      category: category.trim(),
      hashtags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
      embedding: embedding || [],
      wordCount,
    });
    await faq.save();

    // 2. Mark source item
    if (source === 'golden-ticket') {
      const ticket = await GoldenTicket.findById(sourceId);
      if (!ticket) return res.status(404).json({ success: false, error: 'Golden ticket not found' });

      ticket.status = 'resolved';
      ticket.resolvedBy = req.user.id;
      ticket.resolvedAt = new Date();
      ticket.knowledgeCaptured = true;
      await ticket.save();

      // Refund creator
      const rewardSP = Math.floor(ticket.spurtiSpent * 1.25);
      await recordTransaction({
        userId: ticket.createdBy,
        type: 'GOLDEN_TICKET_REFUND',
        amount: rewardSP,
        direction: 'credit',
        description: `Knowledge captured — +${rewardSP} SP refund for Golden Ticket: "${ticket.title}"`,
        metadata: { ticketId: ticket._id, faqId: faq._id, title: ticket.title },
      });

    } else if (source === 'contribution') {
      const contrib = await ContributedFAQ.findById(sourceId);
      if (!contrib) return res.status(404).json({ success: false, error: 'Contribution not found' });

      contrib.status = 'approved';
      await contrib.save();
    }

    res.status(201).json({ success: true, faq, message: 'FAQ promoted successfully' });
  } catch (err) {
    console.error('promoteKnowledge error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};