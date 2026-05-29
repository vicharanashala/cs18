const AuditLog = require('../models/AuditLog');

module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  // Attach an audit helper pre-filled with the admin's identity
  req.audit = {
    adminId:    req.user.id,
    adminEmail: req.user.email,
    log: (opts) => AuditLog.create({
      adminId:    req.user.id,
      adminEmail: req.user.email,
      ...opts,
    }).catch(err => console.error('[AUDIT ERROR]', err.message)),
  };

  next();
};