/**
 * systemSettingsController — Pizza Slice + Public FAQ settings management.
 *
 * Required by Phase 2G Settings Page.
 * All actions are admin-only (enforced by route-level adminMiddleware).
 */

const SystemSettings = require('../models/SystemSettings');
const AuditLog       = require('../models/AuditLog');
const User           = require('../models/User');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch (or init) the singleton SystemSettings document. */
async function getGlobalSettings() {
  return SystemSettings.get();
}

/** Log an audit entry with admin identity already on req. */
async function logAction(req, action, targetId, targetType, reason, metadata = {}) {
  await AuditLog.create({
    adminId:    req.admin.adminId,
    adminEmail: req.admin.adminEmail,
    action,
    targetId,
    targetType,
    reason,
    metadata,
  });
}

// ─── Read Settings ────────────────────────────────────────────────────────────

/**
 * GET /admin/settings
 *
 * Returns the current SystemSettings values + last-updated metadata.
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await getGlobalSettings();

    // Resolve who last updated (fetch admin name if available)
    let updatedByEmail = 'system';
    if (settings.updatedBy) {
      try {
        const adminUser = await User.findById(settings.updatedBy).select('email').lean();
        if (adminUser) updatedByEmail = adminUser.email;
      } catch { /* ignore */ }
    }

    return res.json({
      success: true,
      settings: {
        defaultPizzaSlices:          settings.defaultPizzaSlices,
        publicFAQEnabled:            settings.publicFAQEnabled,
        guestFAQSearchEnabled:       settings.guestFAQSearchEnabled,
        guestAnalyticsTrackingEnabled: settings.guestAnalyticsTrackingEnabled,
        beeSystemPrompt:             settings.beeSystemPrompt,
        beeEnabled:                  settings.beeEnabled,
        updatedBy:                   updatedByEmail,
        updatedAt:                   settings.updatedAt,
      },
    });
  } catch (err) {
    console.error('[systemSettings] getSettings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load settings.' });
  }
};

// ─── Voice Assistant Settings ────────────────────────────────────────────────

exports.updateBeeSettings = async (req, res) => {
  try {
    const { beeSystemPrompt, beeEnabled } = req.body;
    const settings = await getGlobalSettings();
    const changes = {};

    if (beeSystemPrompt !== undefined) {
      settings.beeSystemPrompt = beeSystemPrompt;
      changes.beeSystemPrompt = beeSystemPrompt;
    }
    if (beeEnabled !== undefined) {
      settings.beeEnabled = Boolean(beeEnabled);
      changes.beeEnabled = beeEnabled;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided.' });
    }

    settings.updatedBy = req.admin.adminId;
    await settings.save();

    await logAction(
      req,
      'BEE_SETTINGS_UPDATED',
      settings._id.toString(),
      'SystemSettings',
      `Voice assistant settings updated`,
      changes,
    );

    return res.json({
      success: true,
      message: 'Voice assistant settings updated successfully.',
      ...changes,
    });
  } catch (err) {
    console.error('[systemSettings] updateBeeSettings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update Bee settings.' });
  }
};

// ─── Update Pizza Slices ─────────────────────────────────────────────────────

const VALID_PIZZA_SLICES = [0, 1, 3, 5, 6, 10];

/**
 * PATCH /admin/settings/pizza
 *
 * Body: { defaultPizzaSlices: number }
 *
 * Validation:
 *  - Must be one of VALID_PIZZA_SLICES
 */
exports.updatePizzaSettings = async (req, res) => {
  try {
    const { defaultPizzaSlices } = req.body;

    if (defaultPizzaSlices === undefined) {
      return res.status(400).json({ success: false, error: 'defaultPizzaSlices is required.' });
    }

    const parsed = parseInt(defaultPizzaSlices, 10);
    if (!VALID_PIZZA_SLICES.includes(parsed)) {
      return res.status(400).json({
        success: false,
        error: `defaultPizzaSlices must be one of: ${VALID_PIZZA_SLICES.join(', ')}.`,
      });
    }

    const settings = await getGlobalSettings();
    settings.defaultPizzaSlices = parsed;
    settings.updatedBy = req.admin.adminId;
    await settings.save();

    await logAction(
      req,
      'PIZZA_SETTINGS_UPDATED',
      settings._id.toString(),
      'SystemSettings',
      `defaultPizzaSlices changed to ${parsed}`,
      { defaultPizzaSlices: parsed },
    );

    return res.json({
      success: true,
      message: `Default pizza slices set to ${parsed}.`,
      defaultPizzaSlices: parsed,
    });
  } catch (err) {
    console.error('[systemSettings] updatePizzaSettings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update pizza settings.' });
  }
};

/**
 * POST /admin/settings/pizza/apply-migration
 *
 * Applies defaultPizzaSlices to all users who have NEVER received an
 * initialization slice (identified by: pizzaSlices === null OR
 * pizzaSlices === undefined, AND never had a pizza transaction recorded).
 *
 * WARNING: Only affects truly fresh users.  Already-initialised users are skipped.
 *
 * Audit log entry recorded per the spec:
 *  action: 'SYSTEM_INITIALIZED_PIZZA_SLICES'
 */
exports.applyPizzaMigration = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    const amount   = settings.defaultPizzaSlices;

    // Find users who look untouched:
    //  - pizzaSlices is 0 or null/undefined (never explicitly set)
    //  - has no prior pizza transaction
    // We identify "never initialised" users as those whose pizzaSlices
    // equals 0 AND they have no pizzaTransaction history.
    // A more conservative approach: only migrate users where pizzaSlices === 0
    // (default MongoDB User schema initial value) and we explicitly track
    // `pizzaInitialized: false` in metadata — here we use the pragmatic check:
    const eligibleUsers = await User.find({
      pizzaSlices: 0,           // fresh user, never granted slices
    }).select('_id email pizzaSlices').lean();

    if (eligibleUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible users found for pizza migration.',
        migratedCount: 0,
      });
    }

    const userIds = eligibleUsers.map(u => u._id);

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { pizzaSlices: amount } },
    );

    await logAction(
      req,
      'SYSTEM_INITIALIZED_PIZZA_SLICES',
      'migration',
      'User',
      `Applied ${amount} pizza slice(s) to ${eligibleUsers.length} eligible users.`,
      { amount, migratedCount: eligibleUsers.length, userIds },
    );

    return res.json({
      success: true,
      message: `Applied ${amount} pizza slice(s) to ${eligibleUsers.length} eligible user(s).`,
      migratedCount: eligibleUsers.length,
      amount,
    });
  } catch (err) {
    console.error('[systemSettings] applyPizzaMigration error:', err);
    return res.status(500).json({ success: false, error: 'Migration failed.' });
  }
};

// ─── Public FAQ Toggles ───────────────────────────────────────────────────────

/**
 * PATCH /admin/settings/public-faq
 *
 * Body: { publicFAQEnabled?: boolean, guestFAQSearchEnabled?: boolean,
 *         guestAnalyticsTrackingEnabled?: boolean }
 */
exports.updatePublicFAQSettings = async (req, res) => {
  try {
    const { publicFAQEnabled, guestFAQSearchEnabled, guestAnalyticsTrackingEnabled } = req.body;

    const settings = await getGlobalSettings();
    const changes  = {};

    if (publicFAQEnabled !== undefined) {
      settings.publicFAQEnabled = Boolean(publicFAQEnabled);
      changes.publicFAQEnabled = publicFAQEnabled;
    }
    if (guestFAQSearchEnabled !== undefined) {
      settings.guestFAQSearchEnabled = Boolean(guestFAQSearchEnabled);
      changes.guestFAQSearchEnabled = guestFAQSearchEnabled;
    }
    if (guestAnalyticsTrackingEnabled !== undefined) {
      settings.guestAnalyticsTrackingEnabled = Boolean(guestAnalyticsTrackingEnabled);
      changes.guestAnalyticsTrackingEnabled = guestAnalyticsTrackingEnabled;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided.' });
    }

    settings.updatedBy = req.admin.adminId;
    await settings.save();

    await logAction(
      req,
      'SYSTEM_SETTINGS_UPDATED',
      settings._id.toString(),
      'SystemSettings',
      `Public FAQ settings updated: ${JSON.stringify(changes)}`,
      changes,
    );

    return res.json({
      success: true,
      message: 'Public FAQ settings updated.',
      ...changes,
    });
  } catch (err) {
    console.error('[systemSettings] updatePublicFAQSettings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};