const SearchAnalytics = require('../models/SearchAnalytics');
const DeflectionAnalytics = require('../models/DeflectionAnalytics');
const PersonalTicket = require('../models/PersonalTicket');
const FAQ = require('../models/FAQ');

exports.getQuestionHeatmap = async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const topSearches = await SearchAnalytics.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: '$normalizedQuery', count: { $sum: 1 }, failedCount: { $sum: { $cond: ['$isFailed', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ success: true, topSearches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFrictionZones = async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Combine ticket volume by category and failed searches by category
    const ticketZones = await PersonalTicket.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$category', ticketCount: { $sum: 1 } } }
    ]);
    
    const searchZones = await SearchAnalytics.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo }, isFailed: true } },
      { $group: { _id: '$category', failedSearches: { $sum: 1 } } }
    ]);

    const zonesMap = {};
    ticketZones.forEach(z => { zonesMap[z._id || 'General'] = { category: z._id || 'General', ticketCount: z.ticketCount, failedSearches: 0, frictionScore: z.ticketCount * 10 }; });
    searchZones.forEach(z => { 
      const cat = z._id || 'General';
      if (!zonesMap[cat]) zonesMap[cat] = { category: cat, ticketCount: 0, failedSearches: 0, frictionScore: 0 };
      zonesMap[cat].failedSearches = z.failedSearches;
      zonesMap[cat].frictionScore += z.failedSearches * 5;
    });

    const frictionZones = Object.values(zonesMap).sort((a, b) => b.frictionScore - a.frictionScore).slice(0, 10);
    res.json({ success: true, frictionZones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEscalationHotspots = async (req, res) => {
  try {
    const hotspots = await PersonalTicket.find({ status: { $in: ['submitted', 'under_review'] } })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, hotspots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDeadFaqs = async (req, res) => {
  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const deadFaqs = await FAQ.find({
      $or: [
        { needsReview: true },
        { lastValidatedAt: { $lte: sixMonthsAgo } }
      ]
    }).sort({ lastValidatedAt: 1 }).limit(20).lean();
    
    res.json({ success: true, deadFaqs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDeflectionStats = async (req, res) => {
  try {
    const totalDeflections = await DeflectionAnalytics.countDocuments();
    const recentDeflections = await DeflectionAnalytics.find().sort({ timestamp: -1 }).limit(10).populate('deflectedByFaqId deflectedByDiscussionId deflectedByTicketId').lean();
    res.json({ success: true, totalDeflections, recentDeflections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.revalidateFaq = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    faq.lastValidatedAt = Date.now();
    faq.needsReview = false;
    faq.notHelpfulCount = 0; // Reset
    faq.helpfulCount = 0;
    faq.feedbackUsers = [];
    await faq.save();
    res.json({ success: true, message: 'FAQ Revalidated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
