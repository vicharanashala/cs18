module.exports = (err, req, res, next) => {
  const traceId = req.headers['x-request-id'] || require('crypto').randomUUID();

  // In production, you might want to log to a file or external service instead of console.error
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] [TraceID: ${traceId}] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err.message);
  } else {
    console.error(`[ERROR] [TraceID: ${traceId}] ${req.method} ${req.originalUrl} - ${err.message}`);
  }

  res.status(err.status || 500).json({
    success: false,
    error: "Internal server error",
    message: err.message || "An unexpected error occurred. Please try again later.",
    traceId
  });
};
