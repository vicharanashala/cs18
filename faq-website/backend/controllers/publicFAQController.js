/**
 * publicFAQController — unauthenticated public FAQ knowledge base.
 *
 * Access rules:
 *  - Guests may browse, search, and read published FAQs.
 *  - Guests must NEVER see OAQs, clusters, threads, tickets, or golden tickets.
 *  - Guests do NOT update reading-time / dwell-time / engagement / reputation metrics.
 *
 * Analytics rules (per-request flag — controlled by SystemSettings.guestAnalyticsTrackingEnabled):
 *  - Authenticated user  → existing analytics behaviour (read time, engagement, etc.)
 *  - Unauthenticated req → only safe counter: FAQ.publicViews increment (optional)
 */

const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const SystemSettings = require('../models/SystemSettings');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the MongoDB filter for a published, publicly accessible FAQ. */
function publishedFaqFilter() {
  return {
    needsReview: false,
    isArchived:  { $ne: true },
  };
}

/**
 * Decide whether to run analytics side-effects.
 * Returns true only when the request is authenticated AND guest tracking is enabled.
 */
async function shouldTrackAnalytics(req) {
  if (!req.user) return false;
  try {
    const settings = await SystemSettings.get();
    return settings.guestAnalyticsTrackingEnabled !== false;
  } catch {
    return false;
  }
}

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /public/faqs
 *
 * Paginated public FAQ listing with optional category + tag filters.
 * Query params:
 *   page       (default 1)
 *   limit      (default 20, max 100)
 *   category
 *   tag
 *   sort       newest | most-viewed | most-helpful  (default newest)
 */
exports.getPublicFAQs = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;
    const sort  = req.query.sort || 'newest';

    const filter = publishedFaqFilter();
    if (req.query.category) filter.category = req.query.category.trim();
    if (req.query.tag)      filter.tags = req.query.tag.trim();

    let sortClause;
    switch (sort) {
      case 'most-viewed':  sortClause = { viewCount:   -1, createdAt: -1 }; break;
      case 'most-helpful': sortClause = { helpfulCount: -1, createdAt: -1 }; break;
      default:             sortClause = { createdAt:   -1 }; break; // newest
    }

    const [faqs, total] = await Promise.all([
      FAQ.find(filter)
         .sort(sortClause)
         .skip(skip)
         .limit(limit)
         .select('question answer category tags viewCount helpfulCount notHelpfulCount createdAt') // public fields only
         .lean(),
      FAQ.countDocuments(filter),
    ]);

    res.json({
      success: true,
      faqs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[publicFAQ] getPublicFAQs error:', err);
    res.status(500).json({ success: false, error: 'Failed to load FAQs.' });
  }
};

/**
 * GET /public/faqs/search?q=...
 *
 * Public FAQ-only search.  Never returns OAQs, clusters, tickets, or GTs.
 * Query params:
 *   q        search query (required, min 2 chars)
 *   page
 *   limit
 *   category
 *   sort     newest | most-viewed | most-helpful
 */
exports.searchPublicFAQs = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters.' });
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;
    const sort  = req.query.sort || 'newest';

    const filter = {
      ...publishedFaqFilter(),
      question: { $regex: q, $options: 'i' },
    };
    if (req.query.category) filter.category = req.query.category.trim();

    let sortClause;
    switch (sort) {
      case 'most-viewed':  sortClause = { viewCount:   -1, createdAt: -1 }; break;
      case 'most-helpful': sortClause = { helpfulCount: -1, createdAt: -1 }; break;
      default:             sortClause = { createdAt:   -1 }; break;
    }

    const [faqs, total] = await Promise.all([
      FAQ.find(filter)
         .sort(sortClause)
         .skip(skip)
         .limit(limit)
         .select('question answer category tags viewCount helpfulCount notHelpfulCount createdAt')
         .lean(),
      FAQ.countDocuments(filter),
    ]);

    res.json({
      success: true,
      faqs,
      query: q,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[publicFAQ] searchPublicFAQs error:', err);
    res.status(500).json({ success: false, error: 'Search failed.' });
  }
};

/**
 * GET /public/faqs/:id
 *
 * Read a single published FAQ.  Increments publicViews.
 * Does NOT update reading-time, dwell-time, engagement, or reputation.
 */
exports.getPublicFAQById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ ID.' });
    }

    const faq = await FAQ.findOne({
      _id:         id,
      ...publishedFaqFilter(),
    }).select('question answer category tags viewCount helpfulCount notHelpfulCount createdAt updatedAt').lean();

    if (!faq) {
      return res.status(404).json({ success: false, error: 'FAQ not found.' });
    }

    // Safe: only increment public view counter — no user identity involved
    await FAQ.updateOne({ _id: id }, { $inc: { publicViews: 1 } });

    res.json({ success: true, faq });
  } catch (err) {
    console.error('[publicFAQ] getPublicFAQById error:', err);
    res.status(500).json({ success: false, error: 'Failed to load FAQ.' });
  }
};

