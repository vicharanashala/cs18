module.exports = (req, res, next) => {
  if (!req.user) {
    console.warn(`[AUTH] Admin access denied: Missing user object. Was authMiddleware applied? Path: ${req.originalUrl}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
  }

  if (req.user.role === 'admin') {
    next();
  } else {
    console.warn(`[AUTH] Admin access denied: Insufficient role (${req.user.role}) for user ${req.user.id}. Path: ${req.originalUrl}`);
    return res.status(403).json({ success: false, error: 'Unauthorized admin access' });
  }
};
