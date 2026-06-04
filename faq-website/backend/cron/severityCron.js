/**
 * severityCron.js
 * 
 * Scheduled job to recalculate severity scores for unresolved tickets.
 */

const PersonalTicket = require('../models/PersonalTicket');
const SemanticCluster = require('../models/SemanticCluster');
const GoldenTicket = require('../models/GoldenTicket');
const { calculateSeverity } = require('../utils/severityEngine');

async function recalculateSeverityScores() {
  console.log('[CRON] Starting severity score recalculation...');
  let updatedCount = 0;

  try {
    // 1. Personal Tickets (unresolved)
    const personalTickets = await PersonalTicket.find({
      status: { $nin: ['resolved', 'rejected', 'admin_review'] } // admin_review might be considered pending, but we'll include pending/submitted
    });
    
    for (const ticket of personalTickets) {
      const { severityScore, priorityLevel, severityBreakdown } = calculateSeverity(ticket);
      if (ticket.severityScore !== severityScore) {
        ticket.severityScore = severityScore;
        ticket.priorityLevel = priorityLevel;
        ticket.severityBreakdown = severityBreakdown;
        await ticket.save();
        updatedCount++;
      }
    }

    // 2. Semantic Clusters (Discussions / Generic queries)
    const clusters = await SemanticCluster.find({
      status: { $in: ['OPEN', 'ADMIN_REVIEW'] } // OPEN means active discussion
    });

    for (const cluster of clusters) {
      const { severityScore, priorityLevel, severityBreakdown } = calculateSeverity(cluster);
      if (cluster.severityScore !== severityScore) {
        cluster.severityScore = severityScore;
        cluster.priorityLevel = priorityLevel;
        cluster.severityBreakdown = severityBreakdown;
        await cluster.save();
        updatedCount++;
      }
    }

    // 3. Golden Tickets (unresolved)
    const goldenTickets = await GoldenTicket.find({
      status: 'active'
    });

    for (const ticket of goldenTickets) {
      const { severityScore, priorityLevel, severityBreakdown } = calculateSeverity(ticket);
      if (ticket.severityScore !== severityScore) {
        ticket.severityScore = severityScore;
        ticket.priorityLevel = priorityLevel;
        ticket.severityBreakdown = severityBreakdown;
        await ticket.save();
        updatedCount++;
      }
    }

    console.log(`[CRON] Severity recalculation complete. Updated ${updatedCount} records.`);
  } catch (err) {
    console.error('[CRON] Error recalculating severity scores:', err);
  }
}

/**
 * Initializes the cron job to run every 6 hours.
 */
function initSeverityCron() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  // Run once on startup (with a small delay to let DB connect)
  setTimeout(() => {
    recalculateSeverityScores();
  }, 10000);

  // Then schedule periodically
  setInterval(() => {
    recalculateSeverityScores();
  }, SIX_HOURS);
}

module.exports = { initSeverityCron, recalculateSeverityScores };
