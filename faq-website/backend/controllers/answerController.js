const Answer = require('../models/Answer');
const SemanticCluster = require('../models/SemanticCluster');
const User = require('../models/User');
const { generateConsensus } = require('../utils/consensus');

// ─── Helper: get answer count and consensus lock state ────────────────────────
async function getAnswerCount(clusterId) {
  return Answer.countDocuments({ clusterId });
}

const MAX_ANSWERS = 10;
const CONSENSUS_LOCK_THRESHOLD = 9; // >= 9 answers → locked

// ─── Submit answer ────────────────────────────────────────────────────────────
exports.submitAnswer = async (req, res) => {
  try {
    const { clusterId, text } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Answer is too short.' });
    }

    const cluster = await SemanticCluster.findById(clusterId);
    if (!cluster) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    if (cluster.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'This discussion is closed.' });
    }

    // ── SECURITY: Check consensus lock ─────────────────────────────────────
    const currentCount = await getAnswerCount(clusterId);
    if (currentCount >= CONSENSUS_LOCK_THRESHOLD) {
      return res.status(403).json({
        success: false,
        message: 'Consensus phase has started. No more answers can be submitted.'
      });
    }

    // ── SECURITY: Thread owner cannot answer their own discussion ──────────
    if (cluster.creatorId && cluster.creatorId.toString() === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot answer your own discussion thread.'
      });
    }

    // ── SECURITY: Each user can only answer once per thread ────────────────
    const existingAnswer = await Answer.findOne({ clusterId, userId: req.user.id });
    if (existingAnswer) {
      return res.status(403).json({
        success: false,
        message: 'You have already contributed an answer to this discussion.'
      });
    }

    const user = await User.findById(req.user.id);

    const answer = new Answer({
      userId: req.user.id,
      clusterId,
      text: text.trim(),
      userReputationAtTimeOfPost: user.reputation
    });
    await answer.save();

    // ── Urgency tracking ────────────────────────────────────────────────
    const newCount = currentCount + 1;
    const now = new Date();
    if (newCount === 1) {
      cluster.firstAnswerAt = now;
    }
    cluster.answeredAt = now;
    cluster.answerCount = newCount;

    // Clear urgency once first answer arrives (within grace period)
    if (cluster.isUrgent) cluster.isUrgent = false;

    if (!cluster.participants.some(p => p.userId.toString() === req.user.id)) {
      cluster.participants.push({ userId: req.user.id });
    }

    // Close discussion once 10 answers reached
    if (newCount >= 10) {
      cluster.status = 'CLOSED';
      cluster.isUrgent = false;
      await cluster.save();
      generateConsensus(clusterId); // async — does not block response
    } else {
      await cluster.save();
    }

    res.json({ success: true, message: 'Answer submitted successfully.', answer, answerCount: newCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// ─── Delete answer ────────────────────────────────────────────────────────────
exports.deleteAnswer = async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found.' });

    // ── SECURITY: Only the author can delete ───────────────────────────────
    if (answer.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You did not write this answer.' });
    }

    // ── SECURITY: Consensus lock ───────────────────────────────────────────
    const answerCount = await getAnswerCount(answer.clusterId);
    if (answerCount >= CONSENSUS_LOCK_THRESHOLD) {
      return res.status(403).json({
        success: false,
        message: 'Consensus phase has started. Answers can no longer be deleted.'
      });
    }

    await Answer.findByIdAndDelete(req.params.id);

    // Recalculate cluster answer count + urgency
    const remaining = await Answer.countDocuments({ clusterId: answer.clusterId });
    const SemanticCluster = require('../models/SemanticCluster');
    const cluster = await SemanticCluster.findById(answer.clusterId);
    if (cluster) {
      cluster.answerCount = remaining;
      if (remaining === 0) {
        cluster.firstAnswerAt = null;
        cluster.answeredAt = null;
      }
      // Re-evaluate urgency: if still <10 answers after 3 hrs, mark urgent
      if (remaining < 10 && cluster.status === 'OPEN') {
        const ageHours = (Date.now() - cluster.createdAt) / 3_600_000;
        cluster.isUrgent = ageHours >= 3;
      }
      if (remaining > 0) await cluster.save();
    }

    res.json({ success: true, message: 'Answer deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
