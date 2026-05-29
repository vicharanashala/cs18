/**
 * auditHelper — thin wrapper around AuditLog creation.
 * Every admin action should go through this so we get consistent shape.
 */
const AuditLog = require('../models/AuditLog');

/**
 * Log an admin action.
 *
 * @param {object} opts
 * @param {string} opts.adminId     — ObjectId string of the admin
 * @param {string} opts.adminEmail  — email for safe denormalised display
 * @param {string} opts.action      — AuditLog.action enum value
 * @param {string} opts.targetType  — AuditLog.targetType enum value
 * @param {string} [opts.targetId]  — _id of the affected document
 * @param {string} [opts.targetLabel] — human-readable label
 * @param {string} [opts.reason]    — admin-provided reason
 * @param {object} [opts.metadata]  — extra structured data
 * @param {string} [opts.ipAddress] — request IP
 */
async function logAudit({
  adminId,
  adminEmail,
  action,
  targetType,
  targetId    = null,
  targetLabel = null,
  reason      = null,
  metadata    = {},
  ipAddress   = null,
}) {
  try {
    await AuditLog.create({
      adminId,
      adminEmail,
      action,
      targetType,
      targetId:    targetId    || undefined,
      targetLabel: targetLabel || undefined,
      reason:      reason      || undefined,
      metadata,
      ipAddress:   ipAddress   || undefined,
    });
  } catch (err) {
    // Never let audit failures break the actual operation
    console.error('[AUDIT ERROR]', err.message);
  }
}

module.exports = { logAudit };