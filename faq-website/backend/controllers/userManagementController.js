const User            = require('../models/User');
const Ticket          = require('../models/Ticket');
const Submission      = require('../models/Submission');
const Answer          = require('../models/Answer');
const Attachment      = require('../models/Attachment');
const ContributedFAQ  = require('../models/ContributedFAQ');
const ModerationLog   = require('../models/ModerationLog');
const ActivityLog     = require('../models/ActivityLog');
const MentorCategory  = require('../models/MentorCategory');
const recommendationService = require('../services/recommendation.service');

// ─── PERMISSION MATRIX ────────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
  admin:     3,
  mentor:    2,
  user:      1,
};

const PROTECTED_ROLES = new Set(['admin']);

function canModifyActor(actorRole, targetRole) {
  if (PROTECTED_ROLES.has(targetRole)) return false;
  return (ROLE_HIERARCHY[actorRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}

function buildPermissions(role) {
  const p = {
    admin: {
      fullAccess: true, manageUsers: true, manageModerators: true,
      manageMentors: true, assignRoles: true, accessAnalytics: true,
      reviewTickets: true, moderateContent: true, awardRewards: true,
      answerTickets: true, handleCategories: true, viewRoutedTickets: true,
    },

    mentor: {
      fullAccess: false, manageUsers: false, manageModerators: false,
      manageMentors: false, assignRoles: false, accessAnalytics: false,
      reviewTickets: false, moderateContent: false, awardRewards: false,
      answerTickets: true, handleCategories: true, viewRoutedTickets: true,
    },
    user: {
      fullAccess: false, manageUsers: false, manageModerators: false,
      manageMentors: false, assignRoles: false, accessAnalytics: false,
      reviewTickets: false, moderateContent: false, awardRewards: false,
      answerTickets: false, handleCategories: false, viewRoutedTickets: false,
    },
  };
  return p[role] || p.user;
}

// ─── MIDDLEWARE: REQUIRE ADMIN ────────────────────────────────────────────────
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};



// ─── PERMISSIONS CHECK ────────────────────────────────────────────────────────
exports.getMyPermissions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ permissions: buildPermissions(user.role), role: user.role });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── ROLE MANAGEMENT ──────────────────────────────────────────────────────────
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    const VALID_ROLES = ['user', 'mentor', 'admin'];

    if (!userId || !newRole) return res.status(400).json({ error: 'userId and newRole required' });
    if (!VALID_ROLES.includes(newRole)) return res.status(400).json({ error: 'Invalid role' });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot modify this role. Admins are protected.' });
    }

    const oldRole = target.role;
    target.role = newRole;

    // If demoting from mentor, clear mentor categories
    if (oldRole === 'mentor' && newRole !== 'mentor') {
      target.mentorCategories = [];
      await MentorCategory.deleteMany({ mentorId: target._id });
    }

    await target.save();

    await ModerationLog.create({
      targetUserId: target._id,
      performedBy:  req.user.id,
      action:       'role_change',
      reason:       req.body.reason || '',
      metadata:     { from: oldRole, to: newRole },
    });

    await ActivityLog.create({
      userId:       target._id,
      action:       'role_changed',
      description:  `Role changed from ${oldRole} to ${newRole}`,
      metadata:     { by: req.user.id, from: oldRole, to: newRole },
    });

    return res.json({ success: true, user: { _id: target._id, role: target.role } });
  } catch (err) {
    console.error('[RoleUpdate]', err);
    return res.status(500).json({ error: 'Failed to update role' });
  }
};

exports.promoteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot promote this user' });
    }
    const ROLE_ORDER = ['user', 'mentor', 'admin'];
    const idx = ROLE_ORDER.indexOf(target.role);
    const newRole = ROLE_ORDER[Math.min(idx + 1, ROLE_ORDER.length - 1)];
    if (newRole === target.role) return res.json({ success: true, user: { _id: target._id, role: target.role }, message: 'Already at max role' });
    req.body.newRole = newRole;
    return exports.updateUserRole(req, res);
  } catch {
    return res.status(500).json({ error: 'Promote failed' });
  }
};

exports.demoteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot demote this user' });
    }
    const ROLE_ORDER = ['user', 'mentor', 'admin'];
    const idx = ROLE_ORDER.indexOf(target.role);
    const newRole = ROLE_ORDER[Math.max(idx - 1, 0)];
    if (newRole === target.role) return res.json({ success: true, user: { _id: target._id, role: target.role }, message: 'Already at min role' });
    req.body.newRole = newRole;
    return exports.updateUserRole(req, res);
  } catch {
    return res.status(500).json({ error: 'Demote failed' });
  }
};

exports.assignMentorRole = async (req, res) => {
  try {
    const { userId, categories } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot assign mentor role' });
    }
    target.role = 'mentor';
    if (Array.isArray(categories)) {
      target.mentorCategories = categories;
      for (const cat of categories) {
        await MentorCategory.findOneAndUpdate(
          { category: cat },
          { mentorId: target._id },
          { upsert: true, new: true }
        );
      }
    }
    await target.save();
    await ModerationLog.create({
      targetUserId: target._id,
      performedBy:  req.user.id,
      action:       'mentor_assign',
      reason:       req.body.reason || '',
      metadata:     { categories: categories || [] },
    });
    return res.json({ success: true, user: { _id: target._id, role: target.role, mentorCategories: target.mentorCategories } });
  } catch {
    return res.status(500).json({ error: 'Assign mentor failed' });
  }
};

exports.removeMentorRole = async (req, res) => {
  try {
    const { userId } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot remove mentor role' });
    }
    target.role = 'user';
    target.mentorCategories = [];
    await target.save();
    await MentorCategory.deleteMany({ mentorId: target._id });
    await ModerationLog.create({
      targetUserId: target._id,
      performedBy:  req.user.id,
      action:       'mentor_remove',
      reason:       req.body.reason || '',
    });
    return res.json({ success: true, user: { _id: target._id, role: target.role } });
  } catch {
    return res.status(500).json({ error: 'Remove mentor failed' });
  }
};

// ─── SUSPEND / BAN ────────────────────────────────────────────────────────────
exports.suspendUser = async (req, res) => {
  try {
    const { userId, until, reason } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot suspend this user' });
    }
    target.isSuspended  = true;
    target.suspendedUntil = until ? new Date(until) : null;
    await target.save();
    await ModerationLog.create({
      targetUserId: target._id, performedBy: req.user.id,
      action: 'suspension', reason: reason || '',
      metadata: { until },
    });
    await ActivityLog.create({
      userId: target._id, action: 'suspension',
      description: `Suspended until ${until || 'indefinite'}: ${reason || 'No reason provided'}`,
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Suspend failed' });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.isSuspended  = false;
    target.suspendedUntil = null;
    await target.save();
    await ModerationLog.create({
      targetUserId: target._id, performedBy: req.user.id,
      action: 'unsuspend', reason: reason || '',
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unsuspend failed' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot ban this user' });
    }
    target.isBanned = true;
    target.bannedAt = new Date();
    await target.save();
    await ModerationLog.create({
      targetUserId: target._id, performedBy: req.user.id,
      action: 'ban', reason: reason || '',
    });
    await ActivityLog.create({
      userId: target._id, action: 'ban',
      description: `Banned: ${reason || 'No reason provided'}`,
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Ban failed' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    target.isBanned = false;
    target.bannedAt = null;
    await target.save();
    await ModerationLog.create({
      targetUserId: target._id, performedBy: req.user.id,
      action: 'unban', reason: reason || '',
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Unban failed' });
  }
};

exports.warnUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canModifyActor(req.user.role, target.role)) {
      return res.status(403).json({ error: 'Cannot warn this user' });
    }
    await ModerationLog.create({
      targetUserId: target._id, performedBy: req.user.id,
      action: 'warning', reason: reason || '',
    });
    await ActivityLog.create({
      userId: target._id, action: 'warning_received',
      description: `Warning issued: ${reason || 'No reason provided'}`,
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Warn failed' });
  }
};

// ─── INTERN DIRECTORY ─────────────────────────────────────────────────────────
exports.getInternDirectory = async (req, res) => {
  try {
    const {
      search = '', filter = 'all', role = '',
      sortBy = 'createdAt', order = 'desc',
      page = 1, limit = 20,
    } = req.query;

    const query = {};

    // Search
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [
        { fullName: re }, { username: re }, { email: re },
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    } else {
      switch (filter) {
        case 'active':    query.isBanned = false; query.isSuspended = false; break;
        case 'suspended': query.isSuspended = true;  break;
        case 'banned':    query.isBanned = true;     break;
        case 'mentors':   query.role = 'mentor';     break;
        case 'admins':    query.role = 'admin';      break;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(query),
    ]);

    // Enrich with counts
    const userIds = users.map(u => u._id);
    const [questions, contributions, answers] = await Promise.all([
      Submission.countDocuments({ userId: { $in: userIds } }),
      ContributedFAQ.countDocuments({ contributedBy: { $in: userIds } }),
      Answer.countDocuments({ userId: { $in: userIds } }),
    ]);

    const contribMap = {};
    const answerMap  = {};
    const subMap     = {};

    // Per-user counts
    const [contribs, ans, subs] = await Promise.all([
      ContributedFAQ.aggregate([
        { $match: { contributedBy: { $in: userIds } } },
        { $group: { _id: '$contributedBy', count: { $sum: 1 } } },
      ]),
      Answer.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      Submission.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);
    contribs.forEach(c => { contribMap[c._id.toString()] = c.count; });
    ans.forEach(a => { answerMap[a._id.toString()] = a.count; });
    subs.forEach(s => { subMap[s._id.toString()] = s.count; });

    const enriched = users.map(u => ({
      _id:            u._id,
      fullName:       u.fullName || '',
      username:       u.username || '',
      email:          u.email,
      role:           u.role,
      institution:    u.institution || '',
      spurtiPoints:   u.spurtiPoints || 0,
      pizzaSlices:    u.pizzaSlices  || 0,
      isSuspended:    u.isSuspended  || false,
      isBanned:       u.isBanned     || false,
      createdAt:      u.createdAt,
      questionsCount: subMap[u._id.toString()] || 0,
      contributionsCount: contribMap[u._id.toString()] || 0,
      answersCount:   answerMap[u._id.toString()] || 0,
    }));

    return res.json({ users: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('[Directory]', err);
    return res.status(500).json({ error: 'Failed to fetch directory' });
  }
};

// ─── SINGLE USER (flat shape matching table row) ─────────────────────────────
exports.getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [questionsCount, contributionsCount, answersCount] = await Promise.all([
      Submission.countDocuments({ userId }),
      ContributedFAQ.countDocuments({ contributedBy: userId }),
      Answer.countDocuments({ userId }),
    ]);

    return res.json({
      _id:               user._id,
      username:          user.username || '',
      fullName:          user.fullName  || '',
      email:             user.email,
      role:              user.role,
      institution:       user.institution || '',
      spurtiPoints:      user.spurtiPoints || 0,
      pizzaSlices:       user.pizzaSlices  || 0,
      isSuspended:       !!user.isSuspended,
      isBanned:          !!user.isBanned,
      createdAt:         user.createdAt,
      questionsCount:    questionsCount,
      contributionsCount: contributionsCount,
      answersCount:      answersCount,
    });
  } catch (err) {
    console.error('[SingleUser]', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// ─── UPDATE USER DETAILS ──────────────────────────────────────────────────────
exports.updateUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, username, fullName, institution, role } = req.body;

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Enforce role hierarchy if role is being changed
    if (role && role !== target.role) {
      if (!canModifyActor(req.user.role, target.role)) {
        return res.status(403).json({ error: 'Cannot modify this user\'s role. Admins are protected.' });
      }
      const VALID_ROLES = ['user', 'mentor', 'admin'];
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      const oldRole = target.role;
      target.role = role;
      
      // If demoting from mentor, clear categories
      if (oldRole === 'mentor' && role !== 'mentor') {
        target.mentorCategories = [];
        await MentorCategory.deleteMany({ mentorId: target._id });
      }

      await ModerationLog.create({
        targetUserId: target._id,
        performedBy:  req.user.id,
        action:       'role_change',
        reason:       'Updated via user profile edit',
        metadata:     { from: oldRole, to: role },
      });
      await ActivityLog.create({
        userId:       target._id,
        action:       'role_changed',
        description:  `Role changed from ${oldRole} to ${role}`,
        metadata:     { by: req.user.id, from: oldRole, to: role },
      });
    }

    // Check for email collision
    if (email && email !== target.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email is already in use by another account.' });
      }
      target.email = email;
    }

    // Check for username collision
    if (username && username !== target.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      target.username = username;
    }

    if (fullName !== undefined) target.fullName = fullName;
    if (institution !== undefined) target.institution = institution;

    await target.save();

    return res.json({ success: true, user: target });
  } catch (err) {
    console.error('[UpdateUserDetails]', err);
    return res.status(500).json({ error: 'Failed to update user details' });
  }
};

// ─── INTERN PROFILE ───────────────────────────────────────────────────────────
exports.getInternProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const uid = user._id;

    // Activity counts
    const [
      questionsCount, contributionsCount, faqsApprovedCount, answersCount,
      attachmentsCount, ticketsResolved,
    ] = await Promise.all([
      Submission.countDocuments({ userId: uid }),
      ContributedFAQ.countDocuments({ contributedBy: uid }),
      ContributedFAQ.countDocuments({ contributedBy: uid, status: 'approved' }),
      Answer.countDocuments({ userId: uid }),
      Attachment.countDocuments({ uploadedBy: uid }),
      Ticket.countDocuments({ resolvedAt: { $ne: null } }),
    ]);

    // Rewards
    const rewards = {
      spurtiPoints: user.spurtiPoints || 0,
      pizzaSlices:  user.pizzaSlices  || 0,
      pizzas:       Math.floor((user.pizzaSlices || 0) / 6),
    };

    // Moderation history
    const moderationHistory = await ModerationLog.find({ targetUserId: uid })
      .sort({ createdAt: -1 }).limit(20)
      .populate('performedBy', 'fullName username role').lean();

    // Role-based stats
    let roleSpecific = {};
    if (user.role === 'mentor') {
      const mentorCats = await MentorCategory.find({ mentorId: uid }).lean();
      const assignedTickets = await Ticket.countDocuments({ assignedMentor: uid, status: { $ne: 'resolved' } });
      roleSpecific = { mentorCategories: mentorCats, openAssignedTickets: assignedTickets };
    }

    // Recent activity timeline
    const timeline = await ActivityLog.find({ userId: uid })
      .sort({ createdAt: -1 }).limit(30).lean();

    // Severity stats (tickets authored by this user)
    const ticket = await Ticket.findOne({ userId: uid }).lean();
    const personalTicket = await Ticket.findOne({ userId: uid }).lean();
    const avgSeverity = ticket?.severity || personalTicket?.severity || 0;

    // Deflection analytics
    const deflections = await Ticket.countDocuments({ userId: uid, escalated: false })
      .catch(() => 0);

    return res.json({
      identity: {
        _id:         uid,
        fullName:    user.fullName || '',
        username:    user.username || '',
        email:       user.email,
        role:        user.role,
        institution: user.institution || '',
        joinedAt:    user.createdAt,
        bio:         user.bio || '',
        avatarColor: user.avatarColor || null,
      },
      activity: {
        questionsRaised:    questionsCount,
        contributionsSubmitted: contributionsCount,
        faqsApproved:       faqsApprovedCount,
        answersPosted:      answersCount,
        attachmentsUploaded: attachmentsCount,
      },
      rewards,
      moderation: {
        isSuspended:      user.isSuspended  || false,
        suspendedUntil:   user.suspendedUntil || null,
        isBanned:         user.isBanned     || false,
        bannedAt:         user.bannedAt     || null,
        history:          moderationHistory,
      },
      engagement: {
        deflectionAttempts: deflections,
        ticketsResolved,
        avgSeverityScore: avgSeverity,
      },
      categoryExpertise: user.categoryExpertise || {},
      timeline,
      ...roleSpecific,
    });
  } catch (err) {
    console.error('[Profile]', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ─── SME / MENTOR MAPPING ─────────────────────────────────────────────────────
exports.getSMEMatrix = async (req, res) => {
  try {
    const mappings = await MentorCategory.find()
      .populate('mentorId', 'fullName username email avatarColor')
      .sort({ category: 1 }).lean();

    const enriched = await Promise.all(mappings.map(async (m) => {
      const openTickets = await Ticket.countDocuments({
        category:  m.category,
        assignedMentor: m.mentorId?._id,
        status:   { $nin: ['resolved'] },
      });
      const allOpen = await Ticket.countDocuments({
        category: m.category,
        status:   { $nin: ['resolved'] },
      });
      return {
        category:       m.category,
        mentor:         m.mentorId ? {
          _id:         m.mentorId._id,
          fullName:    m.mentorId.fullName,
          username:    m.mentorId.username,
          email:       m.mentorId.email,
          avatarColor: m.mentorId.avatarColor,
        } : null,
        openTickets,
        totalOpenInCategory: allOpen,
        avgResolutionHours: m.avgResolutionHours || 0,
      };
    }));

    // Also return categories with no mentor
    const allCategories = [...new Set([
      ...enriched.map(e => e.category),
    ])];

    return res.json({ mappings: enriched });
  } catch (err) {
    console.error('[SMEMatrix]', err);
    return res.status(500).json({ error: 'Failed to fetch SME matrix' });
  }
};

exports.assignMentorToCategory = async (req, res) => {
  try {
    const { category, mentorId } = req.body;
    if (!category) return res.status(400).json({ error: 'category required' });

    // Verify mentor exists and is mentor role
    if (mentorId) {
      const mentor = await User.findById(mentorId);
      if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
      if (mentor.role !== 'mentor') return res.status(400).json({ error: 'User is not a mentor' });
    }

    if (mentorId) {
      await MentorCategory.findOneAndUpdate(
        { category },
        { category, mentorId, $setOnInsert: { avgResolutionHours: 0, openTickets: 0 } },
        { upsert: true, new: true },
      );
    } else {
      await MentorCategory.deleteOne({ category });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Assignment failed' });
  }
};

// ─── ACCESS DASHBOARD ─────────────────────────────────────────────────────────
exports.getAccessDashboard = async (req, res) => {
  try {
    const [
      totalUsers, totalMentors, totalMods, totalAdmins,
      recentUsers, topActive, topMentors, topResolvers,
    ] = await Promise.all([
      // Counts by role
      User.countDocuments({ role: 'user'      }),
      User.countDocuments({ role: 'mentor'    }),
      User.countDocuments({ role: 'admin'     }),

      // Recently joined (last 30 days)
      User.find()
        .sort({ createdAt: -1 }).limit(10)
        .select('fullName username email role createdAt institution spurtiPoints')
        .lean(),

      // Most active: most submissions + contributions
      User.find().sort({ spurtiPoints: -1 }).limit(5)
        .select('fullName username email role spurtiPoints pizzaSlices')
        .lean(),

      // Top mentors by mentorCategories count
      User.find({ role: 'mentor' })
        .sort({ spurtiPoints: -1 }).limit(5)
        .select('fullName username email mentorCategories spurtiPoints')
        .lean(),

      // Most tickets resolved (Answer count)
      Answer.aggregate([
        { $group: { _id: '$userId', answerCount: { $sum: 1 } } },
        { $sort: { answerCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 1, answerCount: 1, fullName: '$user.fullName', username: '$user.username', role: '$user.role' } },
      ]),
    ]);

    return res.json({
      metrics: {
        totalUsers, totalMentors, totalAdmins,
      },
      recentlyJoined: recentUsers,
      mostActiveInterns: topActive,
      mostHelpfulMentors: topMentors,
      mostTicketsResolved: topResolvers,
    });
  } catch (err) {
    console.error('[AccessDashboard]', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

// ─── AUTO-ROUTING (severity >= 70) ────────────────────────────────────────────
const SEVERITY_THRESHOLD = 70;

exports.autoRouteTicket = async (ticket) => {
  if (!ticket || (ticket.severity || 0) < SEVERITY_THRESHOLD) return;

  try {
    // Find SME/mentor for this category
    const mapping = await MentorCategory.findOne({ category: ticket.category }).lean();
    const mentorId = mapping?.mentorId || null;

    ticket.assignedMentor = mentorId;
    ticket.autoRouted     = true;
    ticket.routedAt       = new Date();
    ticket.assignedAt     = new Date();
    ticket.routingReason  = mentorId 
      ? `Auto-routed to Assigned SME due to High Severity Score (${ticket.severity})` 
      : `Auto-routed to Admin Queue due to High Severity Score (${ticket.severity})`;

    // Keep status as submitted — moderator queue picks up via autoRouted flag, or we can mark it 'assigned' if mentorId exists.
    // The instructions say "Route To Assigned SME AND Moderator Queue". So we keep it visible in Queue.
    // We will leave status as 'submitted' so it shows up in the queue until accepted.
    await ticket.save();

    console.log(`[AutoRoute] ticket=${ticket.ticketNumber} severity=${ticket.severity} routed to ${mentorId || 'moderator queue'}`);
  } catch (err) {
    console.error('[AutoRoute error]', err);
  }
};

// ─── PERMISSIONS MATRIX ENDPOINT ──────────────────────────────────────────────
exports.getPermissionsMatrix = (req, res) => {
  return res.json({
    matrix: {
      admin:     buildPermissions('admin'),
      moderator: buildPermissions('moderator'),
      mentor:    buildPermissions('mentor'),
      user:      buildPermissions('user'),
    },
    roleHierarchy: ROLE_HIERARCHY,
    protectedRoles: [...PROTECTED_ROLES],
  });
};

// ─── EXPERTISE TRACKING ENGINE (Phase 6A) ───────────────────────────────────
exports.getTopExpertsByCategory = async (req, res) => {
  try {
    const users = await User.find({ categoryExpertise: { $exists: true, $ne: {} } }).lean();
    
    const expertsByCategory = {};
    
    users.forEach(user => {
      if (!user.categoryExpertise) return;
      
      Object.keys(user.categoryExpertise).forEach(category => {
        const stats = user.categoryExpertise[category];
        if (!stats || stats.answersGiven === 0) return;
        
        if (!expertsByCategory[category]) {
          expertsByCategory[category] = [];
        }
        
        const resolutionRate = stats.answersGiven > 0 
          ? (stats.acceptedAnswers / stats.answersGiven) * 100 
          : 0;
        
        const avgResponseTimeMs = stats.answersGiven > 0 
          ? (stats.totalResponseTimeMs / stats.answersGiven) 
          : 0;

        expertsByCategory[category].push({
          user: {
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            role: user.role,
            avatarColor: user.avatarColor,
          },
          answersGiven: stats.answersGiven,
          acceptedAnswers: stats.acceptedAnswers,
          helpfulVotes: stats.helpfulVotes,
          resolutionRate,
          avgResponseTimeMs
        });
      });
    });

    // Sort by answersGiven (or a composite score if needed)
    Object.keys(expertsByCategory).forEach(category => {
      expertsByCategory[category].sort((a, b) => b.answersGiven - a.answersGiven);
    });

    res.json({ success: true, expertsByCategory });
  } catch (err) {
    console.error('[TopExperts]', err);
    res.status(500).json({ error: 'Failed to fetch top experts.' });
  }
};

// ─── SME RECOMMENDATION ENGINE (Phase 6B) ───────────────────────────────────
exports.getSMERecommendations = async (req, res) => {
  try {
    const recommendations = await recommendationService.getSMERecommendations();
    res.json({ success: true, recommendations });
  } catch (err) {
    console.error('[SMERecommendations]', err);
    res.status(500).json({ error: 'Failed to fetch SME recommendations.' });
  }
};

exports.rejectSMERecommendation = async (req, res) => {
  try {
    const { userId, category } = req.body;
    if (!userId || !category) {
      return res.status(400).json({ error: 'userId and category required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.rejectedSMECategories) {
      user.rejectedSMECategories = [];
    }

    if (!user.rejectedSMECategories.includes(category)) {
      user.rejectedSMECategories.push(category);
      await user.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[RejectSMERecommendation]', err);
    res.status(500).json({ error: 'Failed to reject SME recommendation.' });
  }
};

// ─── REWARDS MANAGEMENT ─────────────────────────────────────────────────────
exports.updateRewards = async (req, res) => {
  try {
    const { userId } = req.params;
    const { spurtiPoints, pizzaSlices, operation, field } = req.body;
    // operation: 'set' | 'add' | 'remove'
    // field: 'spurtiPoints' | 'pizzaSlices'
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const numValue = parseInt(pizzaSlices ?? spurtiPoints, 10);
    if (isNaN(numValue)) return res.status(400).json({ error: 'Invalid numeric value' });

    let updated = false;
    if (field === 'spurtiPoints') {
      if (operation === 'set')       user.spurtiPoints  = Math.max(0, numValue);
      else if (operation === 'add')  user.spurtiPoints  = Math.max(0, (user.spurtiPoints || 0) + numValue);
      else if (operation === 'remove') user.spurtiPoints = Math.max(0, (user.spurtiPoints || 0) - numValue);
      updated = true;
    } else if (field === 'pizzaSlices') {
      if (operation === 'set')       user.pizzaSlices   = Math.max(0, numValue);
      else if (operation === 'add')  user.pizzaSlices   = Math.max(0, (user.pizzaSlices || 0) + numValue);
      else if (operation === 'remove') user.pizzaSlices = Math.max(0, (user.pizzaSlices || 0) - numValue);
      updated = true;
    }

    if (updated) await user.save();

    return res.json({
      success: true,
      user: {
        _id:           user._id,
        spurtiPoints:  user.spurtiPoints,
        pizzaSlices:   user.pizzaSlices,
      },
    });
  } catch (err) {
    console.error('[UpdateRewards]', err);
    return res.status(500).json({ error: 'Failed to update rewards' });
  }
};

// ─── USER ACTIVITY LOG ───────────────────────────────────────────────────────
exports.getActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [activities, total] = await Promise.all([
      ActivityLog.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ActivityLog.countDocuments({ userId }),
    ]);

    return res.json({ activities, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('[Activity]', err);
    return res.status(500).json({ error: 'Failed to fetch activity log' });
  }
};

// ─── MODERATION HISTORY ─────────────────────────────────────────────────────
exports.getModerationHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [logs, total] = await Promise.all([
      ModerationLog.find({ targetUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'fullName username role')
        .lean(),
      ModerationLog.countDocuments({ targetUserId: userId }),
    ]);

    return res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('[ModerationHistory]', err);
    return res.status(500).json({ error: 'Failed to fetch moderation history' });
  }
};

// ─── SET ACCOUNT STATUS ──────────────────────────────────────────────────────
exports.setAccountStatus = async (req, res) => {
  try {
    const { userId }       = req.params;
    const { status, reason } = req.body;  // status: 'active' | 'suspended' | 'banned'

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (status === 'active') {
      user.isSuspended    = false;
      user.suspendedUntil = null;
      user.isBanned       = false;
      user.bannedAt       = null;
    } else if (status === 'suspended') {
      user.isSuspended    = true;
      user.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      user.isBanned       = false;
      user.bannedAt       = null;
    } else if (status === 'banned') {
      user.isBanned       = true;
      user.bannedAt       = new Date();
      user.isSuspended    = false;
      user.suspendedUntil = null;
    }

    await user.save();

    const actionMap = { active: 'unsuspend', suspended: 'suspension', banned: 'ban' };
    await ModerationLog.create({
      targetUserId: user._id,
      performedBy:  req.user.id,
      action:       actionMap[status] || 'warning',
      reason:       reason || '',
    });

    return res.json({ success: true, isSuspended: user.isSuspended, isBanned: user.isBanned });
  } catch (err) {
    console.error('[SetAccountStatus]', err);
    return res.status(500).json({ error: 'Failed to set account status' });
  }
};
