/**
 * searchUtils.js — Production-grade hybrid FAQ search engine
 *
 * Combines semantic vector similarity + keyword matching + popularity signals
 * into a unified, tunable ranking system.
 *
 * Usage:
 *   const { searchFAQs, normalizeQuery, clusterSimilarQuestions } = require('./searchUtils');
 */

const getEmbedding = require('./embedding');

// ─── WEIGHT CONFIGURATION ─────────────────────────────────────────────────────
const WEIGHTS = {
  SEMANTIC:       0.50,   // Meaning/intent matching via embeddings
  KEYWORD_EXACT:  0.18,   // Exact phrase in question title
  KEYWORD_FUZZY:  0.10,   // Partial word/token overlap
  TAG_MATCH:      0.08,   // Hashtag/query overlap
  POPULARITY:     0.08,   // helpful votes, views, engagement
  RECENCY:        0.04,   // Freshness / recency decay
  VERIFIED:       0.02,   // Admin-verified boost
};

// ─── STOPWORDS to strip from query tokenisation ───────────────────────────────
const STOPWORDS = new Set([
  'i','a','an','the','is','are','was','were','do','does','did','can','could',
  'will','would','shall','should','may','might','have','has','had','having',
  'be','been','being','this','that','these','those','it','its','they','them',
  'their','we','us','our','you','your','he','she','him','her','his','what',
  'which','who','whom','when','where','why','how','all','each','every','both',
  'few','more','most','other','some','such','no','nor','not','only','own',
  'same','so','than','too','very','just','and','but','if','or','because','as',
  'until','while','about','against','between','into','through','during','before',
  'after','above','below','up','down','out','off','over','under','again','further',
  'then','once','here','there','any','am','of','to','for','with','on','at','by',
]);

// ─── SYNONYM MAP (domain-specific for FAQ platform) ───────────────────────────
const SYNONYMS = {
  accommodation: ['hostel','stay','lodging','residence','housing','room','pg'],
  hostel:        ['accommodation','stay','lodging','pg'],
  lodging:       ['hostel','stay','accommodation','residence'],
  stay:          ['hostel','accommodation','lodging','residence'],
  'joining date':['start date','reporting','onboarding','begin'],
  'joining mail':['offer letter','selection mail','offer email'],
  'offer letter':['selection letter','internship confirmation','joining mail'],
  absence:       ['leave','off','holiday','absent'],
  absent:        ['leave','absence','off','holiday'],
  vacation:      ['leave','absence','holiday'],
  pay:           ['stipend','salary','payment','compensation'],
  salary:        ['stipend','payment','compensation','allowance'],
  lms:           ['vibe','platform','portal','coursework','modules'],
  diary:         ['rosetta','journal','log','reflection'],
  log:           ['rosetta','journal','diary'],
  'no objection':['noc','noc letter','permission','college'],
  certificate:   ['noc','completion','credentials','proof'],
  unresolved:    ['pending','open','unsettled'],
  shortlist:     ['selection','offer','results'],
  schedule:      ['timing','dates','timeline','calendar'],
  partner:       ['team','group','collaboration'],
  mentor:        ['guide','supervisor','mentorship'],
  task:          ['work','project','assignment','deliverable'],
  project:       ['work','task','assignment'],
  zoom:          ['live class','online session','meeting','class'],
  attendance:    ['present','absent','participation','class'],
  participate:   ['join','attend','present','class'],
  wifi:          ['internet','network','connectivity'],
  food:          ['meal','canteen','mess','eatery'],
  exam:          ['test','assessment','quiz'],
  certificate:   ['completion','credentials','noc'],
  dashboard:     ['checkin','check-in','home','homepage','portal'],
  checkin:       ['dashboard','check-in','home','portal'],
  'check-in':    ['dashboard','checkin','home','portal'],
};

// ─── COSINE SIMILARITY ────────────────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length !== vecA.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ─── LEVENSHTEIN DISTANCE (typo tolerance) ─────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// ─── QUERY NORMALISATION ──────────────────────────────────────────────────────
function normalizeQuery(raw) {
  return raw
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalise a full question string (more aggressive than query normalisation) */
function normalizeQuestion(raw) {
  return raw
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\b(i|me|my|we|our|you|your|it|its|they|the|a|an|to|for|in|on|at|by|of|with|from)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function expandWithSynonyms(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const syns = SYNONYMS[token];
    if (syns) syns.forEach(s => expanded.add(s));
  }
  // Also check phrases
  const text = tokens.join(' ');
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (text.includes(key)) syns.forEach(s => expanded.add(s));
  }
  return Array.from(expanded);
}

// ─── KEYWORD SCORING ──────────────────────────────────────────────────────────
function keywordScore(faq, query, tokens, expandedTokens) {
  const q     = (faq.question || '').toLowerCase();
  const a     = (faq.answer   || '').toLowerCase();
  const cats  = (faq.category || '').toLowerCase();
  const tags  = (faq.hashtags || []).map(t => t.toLowerCase());
  const text  = q + ' ' + a + ' ' + cats;

  let exactScore  = 0;
  let fuzzyScore  = 0;
  let tagScore    = 0;

  // Exact phrase — question title (highest weight)
  if (q.includes(query)) {
    exactScore += 1.0;
  } else if (a.includes(query)) {
    exactScore += 0.65;
  } else if (cats.includes(query)) {
    exactScore += 0.5;
  }

  // Token-level fuzzy match (Levenshtein)
  const validTokens = tokens.filter(t => t.length >= 3);
  if (validTokens.length > 0) {
    let matchedScoreSum = 0;
    for (const token of validTokens) {
      const words = text.split(/\s+/);
      let bestRatio = 0;
      for (const word of words) {
        if (word.length < 3) continue;
        const dist = levenshtein(token, word);
        const ratio = 1 - dist / Math.max(token.length, word.length);
        if (ratio > bestRatio) {
          bestRatio = ratio;
        }
      }
      if (bestRatio > 0.75) {
        matchedScoreSum += bestRatio;
      }
    }
    fuzzyScore = matchedScoreSum / validTokens.length;
  }

  // Tag overlap
  const matchedTags = tags.filter(t => expandedTokens.some(w => t.includes(w) || w.includes(t)));
  if (matchedTags.length > 0) tagScore = Math.min(matchedTags.length / Math.max(tokens.length, 1), 1);

  return { exactScore, fuzzyScore, tagScore };
}

// ─── RECENCY SCORE ─────────────────────────────────────────────────────────────
function recencyScore(faq) {
  if (!faq.lastValidatedAt && !faq.createdAt) return 0.5;
  const lastDate = faq.lastValidatedAt || faq.createdAt;
  const months   = (Date.now() - new Date(lastDate)) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0.3, 1 - (months * 0.04));
}

// ─── POPULARITY SCORE ──────────────────────────────────────────────────────────
function popularityScore(faq) {
  const helpful    = faq.helpfulCount    || 0;
  const notHelpful = faq.notHelpfulCount || 0;
  const totalVotes = helpful + notHelpful;
  const views      = faq.viewCount       || 0;
  const engagement = faq.engagementScore || 0;

  let score = 0.5;

  if (totalVotes > 0) {
    const ratio = helpful / totalVotes;
    score += (ratio - 0.5) * 0.4;
  }

  if (views > 0) {
    score += Math.min(Math.log10(views + 1) / 4, 0.3);
  }

  score += Math.min(engagement / 100, 0.3);

  return Math.max(0, Math.min(1, score));
}

// ─── SEMANTIC SCORE (vector similarity) ───────────────────────────────────────
async function semanticScore(faq, query) {
  if (!faq.embedding || faq.embedding.length === 0) return null;
  try {
    const queryEmb = await getEmbedding(query);
    if (!queryEmb || queryEmb.length === 0) return null;
    return Math.max(0, cosineSimilarity(faq.embedding, queryEmb));
  } catch {
    return null;
  }
}

// ─── CORE SEARCH FUNCTION ─────────────────────────────────────────────────────
/**
 * searchFAQs — Hybrid search over an array of FAQ objects.
 *
 * @param {Array}  faqs        - Array of FAQ documents
 * @param {string} rawQuery    - Raw user query string
 * @param {object} options     - { limit, includeSemantic, boostVerified }
 * @returns {Promise<Array>}   - Ranked FAQ results with score breakdown
 */
async function searchFAQs(faqs, rawQuery, options = {}) {
  const { limit = 5, boostVerified = false } = options;

  if (!rawQuery || rawQuery.trim().length < 2) return [];

  const query  = normalizeQuery(rawQuery);
  const tokens = tokenize(query);
  const expandedTokens = expandWithSynonyms(tokens);

  const queryEmbPromise = getEmbedding(query).catch(() => null);

  const scored = [];

  for (const faq of faqs) {
    const { exactScore, fuzzyScore, tagScore } = keywordScore(faq, query, tokens, expandedTokens);

    const kExact  = exactScore  * WEIGHTS.KEYWORD_EXACT;
    const kFuzzy  = fuzzyScore  * WEIGHTS.KEYWORD_FUZZY;
    const kTag    = tagScore    * WEIGHTS.TAG_MATCH;
    const keywordTotal = kExact + kFuzzy + kTag;

    const pop     = popularityScore(faq);
    const rec     = recencyScore(faq);
    const verified = boostVerified && faq.isVerified ? 1 : 0;

    let semScore = null;
    if (faq.embedding && faq.embedding.length > 0) {
      const queryEmb = await queryEmbPromise;
      if (queryEmb && queryEmb.length > 0) {
        semScore = Math.max(0, cosineSimilarity(faq.embedding, queryEmb));
      }
    }

    let semanticComponent = 0;
    if (semScore !== null) {
      semanticComponent = semScore * WEIGHTS.SEMANTIC;
    } else {
      semanticComponent = keywordTotal * WEIGHTS.SEMANTIC * 0.5;
    }

    const finalScore =
      semanticComponent +
      keywordTotal      * WEIGHTS.SEMANTIC * (semScore !== null ? 0.6 : 1.0) +
      pop               * WEIGHTS.POPULARITY +
      rec               * WEIGHTS.RECENCY +
      verified          * WEIGHTS.VERIFIED;

    const rawSimilarity = Math.max(
      semScore || 0,
      exactScore > 0 ? Math.max(0.85, exactScore) : fuzzyScore,
      tagScore
    );
    const similarity = Math.round(rawSimilarity * 1000) / 1000;

    // Debug logging for top candidates
    if (similarity > 0.5) {
      console.log(`[Search Debug] Candidate:`, {
        query,
        similarity,
        faq: faq.question || faq.canonicalQuestion || faq.title
      });
    }

    scored.push({
      ...faq,
      similarity,
      _searchScore:        Math.round(finalScore * 1000) / 1000,
      _semanticScore:      semScore,
      _keywordScore:       Math.round(keywordTotal * 1000) / 1000,
      _popularityScore:    Math.round(pop * 1000) / 1000,
      _recencyScore:       Math.round(rec * 1000) / 1000,
      _matchType:          semScore !== null ? 'semantic' : 'keyword',
      _matchPercentage:    Math.min(99, Math.round(similarity * 100)),
    });
  }

  const MIN_SIMILARITY = 0.75;

  const sorted = scored
    .filter(f => f.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b._searchScore - a._searchScore);

  const deduplicated = deduplicateByQuestion(sorted);

  return deduplicated.slice(0, limit);
}

// ─── FAST TEXT SIMILARITY (character n-gram Jaccard) ─────────────────────────
function textSimilarity(a, b) {
  const normA = normalizeQuery(a);
  const normB = normalizeQuery(b);
  if (normA === normB) return 1;

  const getNgrams = (s, n = 3) => {
    const set = new Set();
    for (let i = 0; i <= s.length - n; i++) set.add(s.slice(i, i + n));
    return set;
  };

  const ngA = getNgrams(normA);
  const ngB = getNgrams(normB);
  const intersection = [...ngA].filter(c => ngB.has(c)).length;
  const union = new Set([...ngA, ...ngB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Token-overlap similarity (Jaccard on normalised tokens).
 * Used as a fast, readable-sentence-aware complement to n-gram similarity.
 */
function tokenOverlapSimilarity(a, b) {
  const normA = normalizeQuery(a);
  const normB = normalizeQuery(b);

  // Quick rejection for very different length strings
  const lenRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
  if (lenRatio < 0.4) return 0;  // lengths too divergent to be similar

  const tokA = new Set(tokenize(normA));
  const tokB = new Set(tokenize(normB));

  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;

  const intersection = [...tokA].filter(t => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Hybrid similarity for cluster-level deduplication.
 * Combines character n-gram similarity (0.55) + token overlap (0.25) + length penalty (0.20).
 *
 * "how do i check in on my dashboard?" vs "how do i check in on the dashboard?"
 * Expected: high score (very similar intent).
 */
function hybridClusterSimilarity(a, b) {
  const simText = textSimilarity(a, b);
  const simTok  = tokenOverlapSimilarity(a, b);

  // Length penalty: if one is significantly shorter, discount slightly
  const normA = normalizeQuery(a);
  const normB = normalizeQuery(b);
  const lenRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);

  return (simText * 0.55) + (simTok * 0.25) + (lenRatio * 0.20);
}

/**
 * Cluster semantically similar FAQs that are near-duplicates.
 * Returns groups of similar FAQs with a representative (highest-scoring) in each group.
 */
function clusterSimilarQuestions(faqs, similarityThreshold = 0.82) {
  if (faqs.length === 0) return [];

  const groups = [];
  const used = new Set();

  for (let i = 0; i < faqs.length; i++) {
    if (used.has(faqs[i]._id)) continue;

    const group = [faqs[i]];
    used.add(faqs[i]._id);

    for (let j = i + 1; j < faqs.length; j++) {
      if (used.has(faqs[j]._id)) continue;
      const sim = textSimilarity(faqs[i].question, faqs[j].question);
      const keywordOverlap = tokenOverlapSimilarity(faqs[i].question, faqs[j].question);

      if (sim < 0.75 || keywordOverlap === 0) {
        continue; // reject obvious mismatch
      }

      if (sim >= similarityThreshold) {
        group.push(faqs[j]);
        used.add(faqs[j]._id);
      }
    }

    groups.push({
      representative: group[0],
      count:          group.length,
      questions:      group.map(f => ({ _id: f._id, question: f.question })),
    });
  }

  return groups;
}

/**
 * Deduplicate an array of cluster/FAQ objects for feed rendering.
 * Uses hybrid similarity (n-gram + token overlap + length ratio) to avoid
 * showing two cards with essentially the same canonical question.
 *
 * Returns deduplicated array with `_groupedCount` attached to each retained item.
 */
function deduplicateFeedItems(items, threshold = 0.78) {
  if (items.length === 0) return [];

  // Sort by engagement/popularity so the best representative wins
  const sorted = [...items].sort((a, b) => {
    const engA = a.engagementScore || a.submissionsCount || 0;
    const engB = b.engagementScore || b.submissionsCount || 0;
    return engB - engA;
  });

  const result = [];
  const used = new Set();

  for (const item of sorted) {
    if (used.has(item._id)) continue;

    const question = item.canonicalQuestion || item.question || '';

    // Find any already-accepted item that's semantically similar
    let match = null;
    for (const accepted of result) {
      const acceptedQ = accepted.canonicalQuestion || accepted.question || '';
      const sim = hybridClusterSimilarity(question, acceptedQ);
      if (sim >= threshold) {
        match = accepted;
        break;
      }
    }

    if (match) {
      // Group under the existing representative; keep the richer participants record
      match._groupedCount = (match._groupedCount || 1) + 1;
      match._groupedVariants = match._groupedVariants || [];
      match._groupedVariants.push({
        _id:         item._id,
        question,
        submissionsCount: item.submissionsCount || 0,
      });
      // Merge participants if the incoming item has more/better user data
      if ((item.participants || []).length > (match.participants || []).length) {
        match.participants = item.participants;
      }
    } else {
      // New canonical entry — preserve full participants array
      result.push({ ...item, _groupedCount: 1, _groupedVariants: [] });
      used.add(item._id);
    }
  }

  return result;
}

// ─── SIMPLE DEDUPLICATION ─────────────────────────────────────────────────────
function deduplicateByQuestion(faqs) {
  const seen = new Set();
  return faqs.filter(f => {
    const key = normalizeQuery(f.question || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── SEARCH SUGGESTIONS (typo-corrected, intent-based) ───────────────────────
function generateSuggestions(rawQuery, knownTopics = []) {
  const tokens = tokenize(normalizeQuery(rawQuery));
  if (tokens.length === 0) return [];

  const suggestions = [];

  for (const token of tokens) {
    for (const topic of knownTopics) {
      const topicTokens = tokenize(topic);
      for (const tt of topicTokens) {
        const dist = levenshtein(token, tt);
        if (dist > 0 && dist <= 2 && dist / Math.max(token.length, tt.length) < 0.4) {
          suggestions.push(topic);
        }
      }
    }
  }

  for (const token of tokens) {
    const syns = SYNONYMS[token];
    if (syns) syns.forEach(s => suggestions.push(s));
  }

  return [...new Set(suggestions)].slice(0, 4);
}

module.exports = {
  searchFAQs,
  clusterSimilarQuestions,
  deduplicateFeedItems,
  normalizeQuery,
  normalizeQuestion,
  tokenize,
  expandWithSynonyms,
  keywordScore,
  recencyScore,
  popularityScore,
  semanticScore,
  cosineSimilarity,
  hybridClusterSimilarity,
  textSimilarity,
  tokenOverlapSimilarity,
  generateSuggestions,
  WEIGHTS,
};