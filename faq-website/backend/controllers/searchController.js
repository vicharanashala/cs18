/**
 * searchController.js — Hybrid search: semantic + keyword + popularity
 *
 * Endpoints:
 *   GET /search?q=&type=faq|discussion   → ranked FAQ results
 *   GET /search/suggest?q=               → autocomplete suggestions
 */

const FAQ = require('../models/FAQ');
const SemanticCluster = require('../models/SemanticCluster');
const ContributedFAQ = require('../models/ContributedFAQ');
const { searchFAQs, normalizeQuery, clusterSimilarQuestions, deduplicateFeedItems, generateSuggestions } = require('../utils/searchUtils');
const SearchAnalytics = require('../models/SearchAnalytics');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Normalise a contributed/discussion FAQ into the same shape as a main FAQ */
function normalizeItem(item, type = 'faq') {
  if (type === 'cluster') {
    // Participants can be populated (lean() after populate) or raw ObjectIds
    const participants = (item.participants || []).map(p => ({
      userId:     typeof p.userId === 'object' ? p.userId : { _id: p.userId },
      joinedAt:   p.joinedAt,
      joinMethod: p.joinMethod,
      question:   p.question,
    }));
    const relatedQueries = (item.relatedQueries || []).map(r => ({
      userId:   typeof r.userId === 'object' ? r.userId : { _id: r.userId },
      joinedAt: r.joinedAt,
      question: r.question,
    }));
    // Boost state: if boostedUntil is set and in the future, boost is active
    const boostedUntil = item.boostedUntil ? new Date(item.boostedUntil) : null;
    const now = new Date();
    const isActive = boostedUntil && boostedUntil > now;
    const boostedMs   = boostedUntil ? Math.max(0, boostedUntil.getTime() - now.getTime()) : 0;
    const boostedSecs = Math.floor(boostedMs / 1000);
    const boostedMins = Math.floor(boostedSecs / 60);

    return {
      _id:              item._id,
      question:         item.canonicalQuestion  || item.originalQuestion,
      answer:           item.aiGeneratedAnswer  || item.context        || '',
      originalQuestion: item.originalQuestion   || item.canonicalQuestion || '',
      context:          item.context            || item.aiGeneratedAnswer || '',
      category:         item.category           || '',
      hashtags:         item.hashtags           || [],
      embedding:        item.embedding          || [],
      helpfulCount:     item.helpfulCount     || 0,
      notHelpfulCount:  item.notHelpfulCount || 0,
      viewCount:        item.viewCount        || 0,
      engagementScore:  item.engagementScore  || 0,
      lastValidatedAt:  item.updatedAt,
      isVerified:       item.status === 'PROMOTED',
      isCluster:        true,
      participants,
      relatedQueries,
      submissionsCount: item.submissionsCount  || 0,
      isBoosted:        isActive,
      boostedUntil:     isActive && boostedMs > 0
        ? `${String(boostedMins).padStart(2, '0')}:${String(boostedSecs % 60).padStart(2, '0')}`
        : null,
      boostedAt:        item.boostedAt || null,
    };
  }
  if (type === 'contrib') {
    return {
      _id:             item._id,
      question:        item.generatedQuestion  || item.originalQuestion,
      answer:          item.generatedAnswer    || item.originalAnswer,
      category:        item.category           || '',
      hashtags:        item.hashtags           || [],
      embedding:       [],
      helpfulCount:    item.helpfulCount     || 0,
      notHelpfulCount: item.notHelpfulCount || 0,
      viewCount:       0,
      engagementScore: 0,
      isContrib:       true,
    };
  }
  return {
    ...item,
    embedding:  item.embedding || [],
    isVerified: item.isVerified || false,
  };
}

// ─── MAIN SEARCH ──────────────────────────────────────────────────────────────
exports.performSearch = async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    const type     = req.query.type || 'faq';

    if (!rawQuery || rawQuery.length < 2) {
      return res.json({ matches: [], matchType: 'none', clusters: [] });
    }

    console.log(`[SEARCH] q="${rawQuery}" type=${type}`);

    if (type === 'faq') {
      const [faqs, contribs, clusters] = await Promise.all([
        FAQ.find({}).select('+embedding').lean(),
        ContributedFAQ.find({ status: 'approved' }).lean(),
        SemanticCluster.find({ status: { $in: ['CLOSED', 'PROMOTED'] } }).lean(),
      ]);

      const allItems = [
        ...faqs.map(f => normalizeItem(f, 'faq')),
        ...contribs.map(c => normalizeItem(c, 'contrib')),
        ...clusters.map(s => normalizeItem(s, 'cluster')),
      ];

      const matches = await searchFAQs(allItems, rawQuery, { limit: 8, boostVerified: true });
      const grouped  = clusterSimilarQuestions(matches, 0.82);
      const insight  = buildInsight(rawQuery, matches);

      return res.json({
        matches:   matches.slice(0, 5),
        clusters:  grouped,
        matchType: matches[0]
          ? (matches[0]._semanticScore !== null ? 'semantic' : 'keyword')
          : 'none',
        insight,
        hasResults: matches.length > 0,
      });

    } else if (type === 'discussion') {
      const discussions = await SemanticCluster.find({ status: { $nin: ['REJECTED'] } }).lean();
      const items = discussions.map(d => normalizeItem(d, 'cluster'));
      const matches = await searchFAQs(items, rawQuery, { limit: 12 });

      // Cluster similar discussion threads so near-duplicates collapse
      const grouped = clusterSimilarQuestions(matches, 0.82);
      // Flatten: use first match as representative, attach cluster count
      const deduped = deduplicateFeedItems(matches, 0.78);

      // Attach _groupedCount to each match so frontend can show "+N similar"
      const matchesWithGrouping = deduped.map(item => ({
        ...item,
        _groupedCount:    item._groupedCount    || 1,
        _groupedVariants: item._groupedVariants || [],
      }));

      return res.json({
        matches:   matchesWithGrouping,
        clusters:  grouped,
        matchType: matches[0]
          ? (matches[0]._semanticScore !== null ? 'semantic' : 'keyword')
          : 'none',
        insight: grouped.length > 0
          ? `${grouped.length} related discussion thread${grouped.length !== 1 ? 's' : ''} grouped`
          : '',
        hasResults: matchesWithGrouping.length > 0,
      });

    } else {
      return res.status(400).json({ error: 'Invalid type. Use ?type=faq or ?type=discussion' });
    }

    // Async analytics (fire-and-forget)
    const safeLog = async () => {
      try {
        await SearchAnalytics.create({
          query:           rawQuery,
          normalizedQuery: normalizeQuery(rawQuery),
          category:        type,
          resultCount:     0,
          sessionId:       req.headers['x-session-id'] || req.ip,
          userId:          (req.user && req.user.id) || null,
          isFailed:        false,
        });
      } catch (e) {
        console.error('[SearchAnalytics]', e.message);
      }
    };
    safeLog();

  } catch (err) {
    console.error('[SEARCH ERROR]', err);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
};

// ─── POPULAR SEARCHES ─────────────────────────────────────────────────────────
exports.getPopularSearches = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const recent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const match = type === 'all' ? {} : { type };
    const top = await SearchAnalytics.aggregate([
      { $match: { ...match, searchedAt: { $gte: recent } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    return res.json({ popular: top.map(t => t._id) });
  } catch {
    return res.json({ popular: [] });
  }
};

// ─── AUTOCOMPLETE SUGGESTIONS ─────────────────────────────────────────────────
exports.getSuggestions = async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    if (rawQuery.length < 2) return res.json({ suggestions: [] });

    const sample = await FAQ.find({}).select('question hashtags category').limit(250).lean();
    const knownTopics = [
      ...sample.map(f => f.question),
      ...sample.flatMap(f => f.hashtags || []),
      ...new Set(sample.map(f => f.category).filter(Boolean)),
    ];

    const suggestions = generateSuggestions(rawQuery, knownTopics);
    return res.json({ suggestions });

  } catch (err) {
    console.error('[SUGGEST ERROR]', err);
    return res.json({ suggestions: [] });
  }
};

// ─── INSIGHT: why did these match? ────────────────────────────────────────────
function buildInsight(query, matches) {
  if (!matches || matches.length === 0) return '';
  const top = matches[0];

  if (top._semanticScore !== null && top._semanticScore > 0.6) {
    const semCount = matches.filter(m => m._semanticScore > 0.5).length;
    return `Matched on meaning & intent — ${semCount} semantically similar result${semCount !== 1 ? 's' : ''} found.`;
  }
  if (top._keywordScore > 0.4) {
    const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
    return `Matched on "${tokens.slice(0, 2).join(' ')}${tokens.length > 2 ? '...' : ''}" and related terms.`;
  }
  return '';
}