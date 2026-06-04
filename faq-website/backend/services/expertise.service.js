const User = require('../models/User');

/**
 * Ensures the category exists in the categoryExpertise map for a given user doc.
 */
function initializeCategory(user, category) {
  if (!user.categoryExpertise) {
    user.categoryExpertise = new Map();
  }
  if (!user.categoryExpertise.has(category)) {
    user.categoryExpertise.set(category, {
      answersGiven: 0,
      acceptedAnswers: 0,
      helpfulVotes: 0,
      totalResponseTimeMs: 0
    });
  }
  return user.categoryExpertise.get(category);
}

exports.recordAnswer = async (userId, category, responseTimeMs) => {
  try {
    if (!category) return;
    const user = await User.findById(userId);
    if (!user) return;
    
    const stats = initializeCategory(user, category);
    stats.answersGiven += 1;
    stats.totalResponseTimeMs += (responseTimeMs || 0);
    
    user.categoryExpertise.set(category, stats);
    await user.save();
  } catch (err) {
    console.error('[Expertise Tracking] recordAnswer Error:', err);
  }
};

exports.recordAcceptedAnswer = async (userId, category) => {
  try {
    if (!category) return;
    const user = await User.findById(userId);
    if (!user) return;
    
    const stats = initializeCategory(user, category);
    stats.acceptedAnswers += 1;
    
    user.categoryExpertise.set(category, stats);
    await user.save();
  } catch (err) {
    console.error('[Expertise Tracking] recordAcceptedAnswer Error:', err);
  }
};

exports.recordHelpfulVote = async (userId, category) => {
  try {
    if (!category) return;
    const user = await User.findById(userId);
    if (!user) return;
    
    const stats = initializeCategory(user, category);
    stats.helpfulVotes += 1;
    
    user.categoryExpertise.set(category, stats);
    await user.save();
  } catch (err) {
    console.error('[Expertise Tracking] recordHelpfulVote Error:', err);
  }
};
