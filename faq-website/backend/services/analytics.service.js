const Ticket = require('../models/Ticket');
const PersonalTicket = require('../models/PersonalTicket');
const SearchAnalytics = require('../models/SearchAnalytics');
const FAQ = require('../models/FAQ');
const DeflectionAnalytics = require('../models/DeflectionAnalytics');
const moment = require('moment');

exports.getActivityPulse = async () => {
  // Aggregate tickets by hour of day
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
  
  const pipeline = [
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $project: {
        hour: { $hour: { date: "$createdAt", timezone: "Asia/Kolkata" } }
      }
    },
    {
      $group: {
        _id: "$hour",
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await Ticket.aggregate(pipeline);
  
  // Format to ensure all 24 hours exist
  const formatted = Array.from({ length: 24 }).map((_, i) => ({
    hour: i,
    count: 0,
    label: moment({ hour: i }).format('h A')
  }));

  results.forEach(r => {
    formatted[r._id].count = r.count;
  });

  return formatted;
};

exports.getTopicTrends = async () => {
  // Most asked topics (by category)
  const pipeline = [
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ];

  const results = await Ticket.aggregate(pipeline);
  return results.map(r => ({
    topic: r._id || 'General',
    count: r.count
  }));
};

exports.getSearchFailures = async () => {
  // Top queries with 0 results or failed
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

  const pipeline = [
    { 
      $match: { 
        timestamp: { $gte: thirtyDaysAgo },
        $or: [{ isFailed: true }, { resultCount: 0 }]
      }
    },
    {
      $group: {
        _id: { $toLower: "$normalizedQuery" },
        failCount: { $sum: 1 },
        lastFailed: { $max: "$timestamp" }
      }
    },
    { $sort: { failCount: -1 } },
    { $limit: 10 }
  ];

  const results = await SearchAnalytics.aggregate(pipeline);
  return results.map(r => ({
    query: r._id,
    failCount: r.failCount,
    lastFailed: r.lastFailed
  }));
};

exports.getEscalationHotspots = async () => {
  // Topics with high priority score or escalated status
  const pipeline = [
    {
      $match: {
        $or: [
          { status: 'escalated' },
          { priorityScore: { $gt: 10 } }
        ]
      }
    },
    {
      $group: {
        _id: "$category",
        escalationCount: { $sum: 1 },
        avgPriority: { $avg: "$priorityScore" }
      }
    },
    { $sort: { escalationCount: -1 } },
    { $limit: 8 }
  ];

  const results = await PersonalTicket.aggregate(pipeline);
  return results.map(r => ({
    topic: r._id || 'General',
    escalationCount: r.escalationCount,
    riskScore: r.avgPriority ? Math.round(r.avgPriority) : (r.escalationCount * 2)
  }));
};

exports.getFaqEffectiveness = async () => {
  const pipeline = [
    {
      $project: {
        question: 1,
        helpfulCount: 1,
        notHelpfulCount: 1,
        totalFeedback: { $add: ["$helpfulCount", "$notHelpfulCount"] },
        helpfulRatio: {
          $cond: [
            { $gt: [{ $add: ["$helpfulCount", "$notHelpfulCount"] }, 0] },
            { $divide: ["$helpfulCount", { $add: ["$helpfulCount", "$notHelpfulCount"] }] },
            0
          ]
        }
      }
    },
    { $match: { totalFeedback: { $gt: 0 } } },
    { $sort: { notHelpfulCount: -1, helpfulRatio: 1 } },
    { $limit: 5 }
  ];

  const results = await FAQ.aggregate(pipeline);
  return results;
};

exports.getFrictionZones = async () => {
  // Combine search failures and ticket volume to get a confusion score
  const topics = await this.getTopicTrends();
  const failures = await this.getSearchFailures();
  
  const frictionMap = {};
  
  topics.forEach(t => {
    frictionMap[t.topic] = { topic: t.topic, ticketVolume: t.count, searchFails: 0 };
  });

  failures.forEach(f => {
    // Basic keyword matching for friction overlap
    const matchedTopic = topics.find(t => f.query.includes(t.topic.toLowerCase()));
    if (matchedTopic) {
      frictionMap[matchedTopic.topic].searchFails += f.failCount;
    }
  });

  const zones = Object.values(frictionMap).map(z => ({
    ...z,
    confusionScore: Math.round((z.ticketVolume * 0.4) + (z.searchFails * 0.6) * 10)
  }));

  return zones.sort((a, b) => b.confusionScore - a.confusionScore).slice(0, 5);
};

exports.getHealthMetrics = async () => {
  // Unresolved tickets count
  const unresolvedCount = await Ticket.countDocuments({ status: { $ne: 'resolved' } });
  
  // Avg resolution time
  const resolvedTickets = await Ticket.find({ status: 'resolved', resolvedAt: { $exists: true } });
  let totalResTime = 0;
  resolvedTickets.forEach(t => {
    totalResTime += (t.resolvedAt - t.createdAt);
  });
  
  const avgResTimeHrs = resolvedTickets.length > 0 
    ? (totalResTime / resolvedTickets.length) / (1000 * 60 * 60) 
    : 0;

  // Simple Health Score
  const healthScore = Math.max(0, 100 - (unresolvedCount * 2) - (avgResTimeHrs));

  return {
    unresolvedCount,
    avgResolutionTimeHours: avgResTimeHrs.toFixed(1),
    healthScore: Math.round(healthScore)
  };
};
