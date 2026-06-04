/**
 * Routes at /api/user-management/*
 * These wrap the existing userManagementController with correct response shapes
 * so the frontend UserManagementTab gets the field names it expects.
 */
const express   = require('express');
const router    = express.Router();
const umc       = require('../controllers/userManagementController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/user-management/directory
// Wraps getInternDirectory → reshapes { users } → { directory } (old compat)
router.get('/directory', async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && body.users) {
      body.directory = body.users;
      delete body.users;
    }
    return originalJson(body);
  };
  return umc.getInternDirectory(req, res);
});

// GET /api/user-management/users
// Returns { users, total, page, pages } — full enriched list for admin table
router.get('/users', umc.requireAdmin, async (req, res, next) => {
  try {
    await umc.getInternDirectory(req, res, next);
  } catch (err) { next(err); }
});

// GET /api/user-management/users/:userId
// Returns flat user object for the detail panel
router.get('/users/:userId', umc.requireAdmin, umc.getSingleUser);

// PUT /api/user-management/users/:userId
// Updates basic user info (Email, Username, FullName, Institution, Role)
router.put('/users/:userId', umc.requireAdmin, umc.updateUserDetails);

// GET /api/user-management/profile/:userId
// Wraps getInternProfile → reshapes raw user → { profile }
router.get('/profile/:userId', async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Convert Maps (categoryExpertise) and strip Mongoose metadata, then wrap as { profile }
    const safe = JSON.parse(JSON.stringify(body));
    const { identity, activity, rewards, moderation, engagement, categoryExpertise, timeline, ...rest } = safe;
    return originalJson({ profile: safe });
  };
  return umc.getInternProfile(req, res);
});

// GET /api/user-management/experts
// Wraps getTopExpertsByCategory → reshapes { expertsByCategory } → { experts }
router.get('/experts', async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && body.expertsByCategory) {
      body.experts = body.expertsByCategory;
      delete body.expertsByCategory;
    }
    return originalJson(body);
  };
  return umc.getTopExpertsByCategory(req, res);
});

// GET /api/user-management/sme-recommendations
// Wraps getSMERecommendations (already returns { recommendations } — shape is correct)
// but also needs admin role
router.get('/sme-recommendations', umc.requireAdmin, async (req, res) => {
  return umc.getSMERecommendations(req, res);
});

// ── Role management (admin only) ─────────────────────────────────────────────
router.get  ('/permissions',               umc.getMyPermissions);
router.get  ('/permissions/matrix',        umc.getPermissionsMatrix);
router.post ('/role/update',               umc.requireAdmin, umc.updateUserRole);
router.post ('/role/promote',              umc.requireAdmin, umc.promoteUser);
router.post ('/role/demote',               umc.requireAdmin, umc.demoteUser);
router.post ('/role/assign-mentor',        umc.requireAdmin, umc.assignMentorRole);
router.post ('/role/remove-mentor',        umc.requireAdmin, umc.removeMentorRole);

// ── Moderation (admin only) ───────────────────────────────────────────────────
router.post ('/suspend',                   umc.requireAdmin, umc.suspendUser);
router.post ('/unsuspend',                 umc.requireAdmin, umc.unsuspendUser);
router.post ('/ban',                       umc.requireAdmin, umc.banUser);
router.post ('/unban',                     umc.requireAdmin, umc.unbanUser);
router.post ('/warn',                      umc.requireAdmin, umc.warnUser);

// ── Directory & profiles ──────────────────────────────────────────────────────
router.get  ('/access-dashboard',          umc.requireAdmin, umc.getAccessDashboard);

// ── SME / Mentor mapping (admin only) ─────────────────────────────────────────
router.get  ('/sme-matrix',                umc.requireAdmin, umc.getSMEMatrix);
router.post ('/sme-matrix/assign',         umc.requireAdmin, umc.assignMentorToCategory);

// ── SME Recommendation Engine (Phase 6B) ──────────────────────────────────────
router.post ('/sme-recommendations/reject', umc.requireAdmin, umc.rejectSMERecommendation);

// ── Rewards management ────────────────────────────────────────────────────────
// Map route param → req.body.field + remap amount → correct field name
const spMiddleware     = (req, res, next) => { req.body.field = 'spurtiPoints'; req.body.spurtiPoints = req.body.amount;        next(); };
const pizzaMiddleware  = (req, res, next) => { req.body.field = 'pizzaSlices';  req.body.pizzaSlices  = req.body.amount;        next(); };
const slicesMiddleware = (req, res, next) => { req.body.field = 'pizzaSlices';  req.body.pizzaSlices  = req.body.amount;        next(); };

router.patch('/users/:userId/sp',      umc.requireAdmin, spMiddleware,     umc.updateRewards);
router.patch('/users/:userId/pizza',   umc.requireAdmin, pizzaMiddleware,  umc.updateRewards);
router.patch('/users/:userId/slices',  umc.requireAdmin, slicesMiddleware, umc.updateRewards);

// ── Activity & Moderation logs ────────────────────────────────────────────────
router.get  ('/users/:userId/activity',       umc.requireAdmin, umc.getActivity);
router.get  ('/users/:userId/moderation-log', umc.requireAdmin, umc.getModerationHistory);

// ── Account status ────────────────────────────────────────────────────────────
router.post ('/users/:userId/status',         umc.requireAdmin, umc.setAccountStatus);

module.exports = router;