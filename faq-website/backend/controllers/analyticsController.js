const analyticsService = require('../services/analytics.service');

// Simple in-memory cache to prevent DB overload from dashboard refreshes
let cache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

exports.getDashboardData = async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if valid
    if (cache.data && (now - cache.timestamp < CACHE_TTL)) {
      return res.json({ success: true, cached: true, data: cache.data });
    }

    // Run aggregations in parallel
    const [
      activityPulse,
      topicTrends,
      searchFailures,
      escalationHotspots,
      faqEffectiveness,
      frictionZones,
      healthMetrics
    ] = await Promise.all([
      analyticsService.getActivityPulse(),
      analyticsService.getTopicTrends(),
      analyticsService.getSearchFailures(),
      analyticsService.getEscalationHotspots(),
      analyticsService.getFaqEffectiveness(),
      analyticsService.getFrictionZones(),
      analyticsService.getHealthMetrics()
    ]);

    const dashboardData = {
      activityPulse,
      topicTrends,
      searchFailures,
      escalationHotspots,
      faqEffectiveness,
      frictionZones,
      healthMetrics
    };

    // Update cache
    cache = {
      data: dashboardData,
      timestamp: now
    };

    res.json({ success: true, cached: false, data: dashboardData });
  } catch (err) {
    console.error('Analytics aggregation error:', err);
    res.status(500).json({ error: 'Failed to generate analytics dashboard.' });
  }
};
