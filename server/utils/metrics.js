const startedAt = new Date();

const metrics = {
  started_at: startedAt.toISOString(),
  requests_total: 0,
  requests_by_status: {},
  requests_by_route: {},
  response_time_ms: {
    count: 0,
    total: 0,
    max: 0,
  },
};

function routeKey(req) {
  const route = req.route?.path || req.path || "unknown";
  return `${req.method} ${route}`;
}

function recordRequest(req, res, durationMs) {
  metrics.requests_total += 1;
  metrics.requests_by_status[res.statusCode] =
    (metrics.requests_by_status[res.statusCode] || 0) + 1;

  const key = routeKey(req);
  metrics.requests_by_route[key] = (metrics.requests_by_route[key] || 0) + 1;

  metrics.response_time_ms.count += 1;
  metrics.response_time_ms.total += durationMs;
  metrics.response_time_ms.max = Math.max(metrics.response_time_ms.max, durationMs);
}

function snapshot() {
  const { count, total, max } = metrics.response_time_ms;
  return {
    ...metrics,
    uptime_seconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    response_time_ms: {
      avg: count ? Math.round(total / count) : 0,
      max: Math.round(max),
    },
  };
}

module.exports = { recordRequest, snapshot };
