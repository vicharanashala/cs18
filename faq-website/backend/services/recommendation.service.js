const User = require('../models/User');
const MentorCategory = require('../models/MentorCategory');

// A perfect SME would likely have roughly this score. We use this to calculate a % confidence.
// This is arbitrary but gives a baseline. Say, 20 answers, 15 accepted, 10 helpful, 90% resolution
// = (20*1) + (15*3) + (10*2) + (90*0.5) = 20 + 45 + 20 + 45 = 130
const IDEAL_SCORE = 130;

exports.getSMERecommendations = async () => {
  try {
    // 1. Fetch all users who have expertise tracking and aren't suspended/banned
    const candidates = await User.find({
      categoryExpertise: { $exists: true, $ne: {} },
      isBanned: { $ne: true },
      isSuspended: { $ne: true }
    }).lean();

    // 2. Fetch existing mentor assignments to skip them
    const existingMentors = await MentorCategory.find().lean();
    const assignedMap = {};
    existingMentors.forEach(m => {
      assignedMap[m.category] = m.mentorId?.toString();
    });

    const recommendations = [];

    candidates.forEach(user => {
      if (!user.categoryExpertise) return;
      
      const rejectedCategories = user.rejectedSMECategories || [];

      Object.keys(user.categoryExpertise).forEach(category => {
        // Skip if category already has a mentor
        if (assignedMap[category]) return;
        
        // Skip if user was rejected for this category
        if (rejectedCategories.includes(category)) return;

        const stats = user.categoryExpertise[category];
        if (!stats || stats.answersGiven < 2) return; // Need at least 2 answers to be recommended

        const resolutionRate = stats.answersGiven > 0 
          ? (stats.acceptedAnswers / stats.answersGiven) * 100 
          : 0;
        
        // Formula: (Answers * 1) + (Accepted * 3) + (Helpful * 2) + (Resolution Rate * 0.5)
        const score = (stats.answersGiven * 1.0) 
                    + (stats.acceptedAnswers * 3.0) 
                    + (stats.helpfulVotes * 2.0) 
                    + (resolutionRate * 0.5);

        // Calculate confidence
        let confidence = Math.min(99, Math.round((score / IDEAL_SCORE) * 100));
        if (confidence < 1) confidence = 1;

        // Arbitrary threshold: Only recommend if confidence >= 30%
        if (confidence >= 30) {
          recommendations.push({
            user: {
              _id: user._id,
              fullName: user.fullName,
              username: user.username,
              email: user.email,
              role: user.role,
              avatarColor: user.avatarColor,
            },
            category,
            confidence,
            stats: {
              answersGiven: stats.answersGiven,
              acceptedAnswers: stats.acceptedAnswers,
              helpfulVotes: stats.helpfulVotes,
              resolutionRate: parseFloat(resolutionRate.toFixed(1))
            },
            score
          });
        }
      });
    });

    // Sort by highest confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return recommendations;
  } catch (err) {
    console.error('[RecommendationService] Error:', err);
    throw err;
  }
};
