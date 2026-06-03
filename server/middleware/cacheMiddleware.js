const cache = require("../utils/cache");

function cacheResponse(ttlSeconds, buildKey) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const key =
      typeof buildKey === "function"
        ? buildKey(req)
        : `http:${req.user?.id || "anon"}:${req.originalUrl}`;

    try {
      const hit = await cache.getJSON(key);
      if (hit) {
        res.set("x-cache", "HIT");
        return res.json(hit);
      }

      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await cache.setJSON(key, body, ttlSeconds);
        }
        res.set("x-cache", "MISS");
        return originalJson(body);
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { cacheResponse };
