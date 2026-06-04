const FAQ = require('../models/FAQ');

const { normalizeCategory } = require('../utils/constants');

exports.getFaqs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find()
      .populate('attachments.uploadedBy', 'username email')
      .lean();

    // Dynamically calculate recentViewsBoost for each FAQ on read
    const mapped = faqs.map(faq => {
      let recentViewsBoost = 0;
      if (faq.recentViewCount !== undefined && faq.lastViewedAt) {
        const hoursElapsed = (Date.now() - new Date(faq.lastViewedAt)) / (1000 * 60 * 60);
        const decayed = faq.recentViewCount * Math.exp(-0.05 * hoursElapsed);
        recentViewsBoost = Math.min(10, decayed);
      }
      
      const wordCount = faq.wordCount || `${faq.question} ${faq.answer}`.trim().split(/\s+/).filter(Boolean).length;
      const expectedReadTime = Math.max(1, wordCount * 0.3);
      const engagementRatio = (faq.averageReadTime || 0) / expectedReadTime;
      const computedScore = (faq.viewCount * 0.35) + (engagementRatio * 0.65);

      return {
        ...faq,
        category: normalizeCategory(faq.category || faq.categoryId?.name || faq.categoryId || 'Other'),
        wordCount,
        engagementScore: faq.engagementScore || computedScore,
        recentViewsBoost
      };
    });

    res.json({ success: true, faqs: mapped });
  } catch (err) {
    next(err);
  }
};

exports.trackViewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { readTimeInSeconds } = req.body;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    if (faq.wordCount === undefined || faq.wordCount === null) {
      faq.wordCount = `${faq.question} ${faq.answer}`.trim().split(/\s+/).filter(Boolean).length;
    }

    const expectedReadTime = Math.max(1, faq.wordCount * 0.3);
    const maxTrackedTime = expectedReadTime * 3;
    const trackedTime = Math.max(0, Math.min(Number(readTimeInSeconds) || 0, maxTrackedTime));

    faq.viewCount = (faq.viewCount || 0) + 1;
    faq.totalReadTime = (faq.totalReadTime || 0) + trackedTime;
    faq.averageReadTime = faq.totalReadTime / faq.viewCount;

    const engagementRatio = faq.averageReadTime / expectedReadTime;
    faq.engagementScore = (faq.viewCount * 0.35) + (engagementRatio * 0.65);

    const now = new Date();
    const lastViewed = faq.lastViewedAt || now;
    const hoursElapsed = (now.getTime() - lastViewed.getTime()) / (1000 * 60 * 60);
    
    const currentRecentCount = faq.recentViewCount || 0;
    faq.recentViewCount = (currentRecentCount * Math.exp(-0.05 * hoursElapsed)) + 1;
    faq.lastViewedAt = now;

    await faq.save();

    res.json({
      success: true,
      message: 'View session recorded successfully',
      faq: {
        _id: faq._id,
        viewCount: faq.viewCount,
        averageReadTime: faq.averageReadTime,
        engagementScore: faq.engagementScore,
        recentViewsBoost: Math.min(10, faq.recentViewCount)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { helpful, sessionId } = req.body;
    
    // Use req.user.id if authenticated, or a passed sessionId/fingerprint
    const voterId = (req.user && req.user.id) || sessionId || req.ip;

    if (!voterId) {
      return res.status(400).json({ success: false, message: 'Could not identify voter.' });
    }

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    if (faq.feedbackUsers && faq.feedbackUsers.includes(voterId)) {
      return res.status(400).json({ success: false, message: 'You have already provided feedback for this FAQ.' });
    }

    if (helpful) {
      faq.helpfulCount = (faq.helpfulCount || 0) + 1;
    } else {
      faq.notHelpfulCount = (faq.notHelpfulCount || 0) + 1;
    }

    // Initialize array if it doesn't exist
    if (!faq.feedbackUsers) faq.feedbackUsers = [];
    faq.feedbackUsers.push(voterId);

    // Smart UX: Flag internally if downvotes are high
    if (faq.notHelpfulCount >= 5 && faq.notHelpfulCount > (faq.helpfulCount || 0)) {
      faq.needsReview = true;
    }

    await faq.save();

    res.json({ 
      success: true, 
      message: 'Feedback recorded successfully.', 
      helpfulCount: faq.helpfulCount, 
      notHelpfulCount: faq.notHelpfulCount 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faqs/:id
 * Public — no authentication required.
 * Returns a single published FAQ so that guest users can open FAQ detail pages.
 */
exports.getFaqById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id)
      .populate('attachments.uploadedBy', 'username email')
      .lean();

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    res.json({ success: true, faq });
  } catch (err) {
    next(err);
  }
};
