/**
 * severityEngine.js
 * 
 * Calculates dynamic severity scores for tickets based on predefined formula.
 */

const URGENCY_KEYWORDS = ['urgent', 'asap', 'emergency', 'stuck', 'blocked', 'deadline', 'critical', 'immediate', 'help', 'please'];

const CATEGORY_TIERS = {
  // HIGH Urgency (25 pts)
  'onboarding': 25,
  'access': 25,
  'it': 25,
  'payroll': 25,
  'stipend': 25,
  'attendance': 25,
  
  // MODERATE Urgency (15 pts)
  'leave': 15,
  'hardware': 15,
  'exam': 15,
  'offer letter': 15,
  'certificates': 15,
  
  // LOW Urgency (5 pts)
  'general': 5,
  'feedback': 5,
  'other': 5,
};

/**
 * Calculates severity for a ticket.
 * @param {Object} ticket - Mongoose document or plain object of the ticket
 * @returns {Object} { severityScore, priorityLevel, severityBreakdown }
 */
function calculateSeverity(ticket) {
  let d1 = 0; // Language Urgency (Max 30)
  let d2 = 0; // Category Baseline (Max 25)
  let d3 = 0; // Time Decay (Max 20)
  let d4 = 0; // Repeat Behavior (Max 15)
  let d5 = 0; // Engagement Signal (Max 10)
  let d6 = 0; // Attachment Evidence (Max 10)

  const textToScan = `${ticket.question || ''} ${ticket.context || ''} ${ticket.title || ''}`.toLowerCase();

  // D1: Language Urgency
  let matchedKeywords = 0;
  URGENCY_KEYWORDS.forEach(kw => {
    if (textToScan.includes(kw)) matchedKeywords++;
  });
  d1 = Math.min(30, matchedKeywords * 10);

  // D2: Category Baseline
  const category = (ticket.category || ticket.customCategory || 'general').toLowerCase();
  d2 = CATEGORY_TIERS[category] || 10; // Default 10 if unknown
  d2 = Math.min(25, d2);

  // D3: Time Decay
  const createdDate = ticket.createdAt || new Date();
  const hoursSinceCreation = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60);
  d3 = Math.min(20, Math.floor(hoursSinceCreation * 2)); // 2 points per hour

  // D4: Repeat Behavior
  let repeatCount = 0;
  if (ticket.participants && Array.isArray(ticket.participants)) {
    repeatCount = Math.max(0, ticket.participants.length - 1); // 1 is original
  }
  // For golden tickets, spurtiSpent can act as a repeat behavior signal (how many people backed it)
  if (ticket.spurtiSpent) {
    repeatCount = ticket.spurtiSpent;
  }
  d4 = Math.min(15, repeatCount * 5); // 5 points per extra participant/vote

  // D5: Engagement Signal
  let engagementCount = 0;
  if (ticket.viewCount) engagementCount += ticket.viewCount;
  if (ticket.answerCount) engagementCount += ticket.answerCount;
  if (ticket.helpfulCount) engagementCount += ticket.helpfulCount;
  d5 = Math.min(10, Math.floor(engagementCount * 1)); // 1 point per engagement interaction

  // D6: Attachment Evidence
  if (ticket.attachments && ticket.attachments.length > 0) {
    d6 = 10;
  }

  // Calculate Total
  const totalRaw = d1 + d2 + d3 + d4 + d5 + d6;
  const severityScore = Math.min(100, totalRaw);

  // Determine Priority Level
  let priorityLevel = 'LOW';
  if (severityScore >= 81) {
    priorityLevel = 'CRITICAL';
  } else if (severityScore >= 61) {
    priorityLevel = 'URGENT';
  } else if (severityScore >= 41) {
    priorityLevel = 'HIGH';
  } else if (severityScore >= 21) {
    priorityLevel = 'MODERATE';
  }

  return {
    severityScore,
    priorityLevel,
    severityBreakdown: {
      D1_LanguageUrgency: d1,
      D2_CategoryBaseline: d2,
      D3_TimeDecay: d3,
      D4_RepeatBehavior: d4,
      D5_EngagementSignal: d5,
      D6_AttachmentEvidence: d6
    }
  };
}

module.exports = { calculateSeverity };
