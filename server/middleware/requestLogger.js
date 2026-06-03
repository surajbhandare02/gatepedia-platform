const logger = require("../utils/logger");
const metrics = require("../utils/metrics");

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    metrics.recordRequest(req, res, durationMs);
    logger.info("http_request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: durationMs,
      user_id: req.user?.id,
      ip: req.ip,
    });
  });
  next();
}

module.exports = { requestLogger };
