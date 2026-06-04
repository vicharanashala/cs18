const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
// Role hierarchy: higher index = higher privilege
const ROLE_HIERARCHY = ['user', 'mentor', 'admin'];

const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role ?? 'user');

/**
 * Check if the acting admin can moderate the target user.
 * Rules:
 * - admin can moderate mentors and users
 */
const canModerate = (actorRole, targetRole) => {
  const actorLevel = getRoleLevel(actorRole);
  const targetLevel = getRoleLevel(targetRole);
  return actorLevel > targetLevel;
};

/**
 * Check if a role is considered a protected admin account.
 */
const isProtectedRole = (role) => (role === 'admin');

/**
 * Middleware factory: require the acting admin to have higher role than target user.
 * Expects req.params.userId to be set.
 * Attaches `targetUser` to req for use in the controller.
 */
const requireCanModerate = async (req, res, next) => {
  const targetUserId = req.params.userId || req.params.id;
  if (!targetUserId) return res.status(400).json({ error: 'userId is required' });

  let targetUser;
  try {
    targetUser = await User.findById(targetUserId).select('-password').lean();
  } catch {
    // Not a valid ObjectId — try User lookup by email or other identifier
    targetUser = await User.findOne({ email: targetUserId }).select('-password').lean();
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  // Prevent self-moderation
  if (req.user.id === targetUser._id.toString()) {
    return res.status(400).json({ error: 'You cannot moderate your own account' });
  }

  const { canModerate, isProtectedRole } = req.roleHelpers;

  if (isProtectedRole(targetUser.role)) {
    return res.status(403).json({ error: 'Protected administrator account — moderation not allowed' });
  }

  if (!canModerate(req.user.role, targetUser.role)) {
    const actorLevel = req.roleHelpers.getRoleLevel(req.user.role);
    const targetLevel = req.roleHelpers.getRoleLevel(targetUser.role);
    const reason = targetLevel >= actorLevel
      ? 'Insufficient privileges: cannot moderate accounts at your role level or higher'
      : 'Protected administrator account — moderation not allowed';
    return res.status(403).json({ error: reason });
  }

  req.targetUser = targetUser;
  next();
};

module.exports = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (!['admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  // Attach role helpers to the request
  req.roleHelpers = { getRoleLevel, canModerate, isProtectedRole, ROLE_HIERARCHY };

  // ── Populate req.user.email if missing ────────────────────────────────────
  // authMiddleware only attaches { id, role } from JWT payload.
  // We need the email for AuditLog entries. Look it up from the DB.
  if (!req.user.email) {
    let admin = await User.findById(req.user.id).select('email').lean();
    if (admin) {
      req.user.email = admin.email;
    }
  }

  // Attach an audit helper pre-filled with the admin's identity
  req.audit = {
    adminId:    req.user.id,
    adminType:  'Admin',
    adminEmail: req.user.email,
    log: (opts) => AuditLog.create({
      adminId:    req.user.id,
      adminType:  'Admin',
      adminEmail: req.user.email,
      ...opts,
    }).catch(err => console.error('[AUDIT ERROR]', err.message)),
  };

  next();
};

module.exports.requireCanModerate = requireCanModerate;