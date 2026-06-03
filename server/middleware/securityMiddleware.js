const crypto = require("crypto");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient } = require("../utils/cache");
const {
  cookieSecret,
  csrfCookieName,
  refreshCookieName,
  nodeEnv,
  rateLimit: rateLimitConfig,
} = require("../config/env");
const { HttpError } = require("./errorHandler");

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

let _apiRateLimiter;
let _authRateLimiter;

const apiRateLimiter = (req, res, next) => {
  if (!_apiRateLimiter) {
    const client = getRedisClient();
    _apiRateLimiter = rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.max,
      store: client ? new RedisStore({ sendCommand: (...args) => client.sendCommand(args), prefix: "rl:api:" }) : undefined,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: "Too many requests. Please slow down." },
    });
  }
  return _apiRateLimiter(req, res, next);
};

const authRateLimiter = (req, res, next) => {
  if (!_authRateLimiter) {
    const client = getRedisClient();
    _authRateLimiter = rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.authMax,
      store: client ? new RedisStore({ sendCommand: (...args) => client.sendCommand(args), prefix: "rl:auth:" }) : undefined,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: "Too many login attempts. Try again later." },
    });
  }
  return _authRateLimiter(req, res, next);
};

function sanitizeString(value) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\son[a-z]+\s*=/gi, " ");
}

function sanitizeValue(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) return value;

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    output[key] = sanitizeValue(nested);
  }
  return output;
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === "object") req.body = sanitizeValue(req.body);
  if (req.query && typeof req.query === "object") req.query = sanitizeValue(req.query);
  next();
}

function generateCsrfToken(res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(csrfCookieName, token, {
    httpOnly: false,
    secure: nodeEnv === "production",
    sameSite: "lax",
    signed: false,
  });
  return token;
}

function csrfProtection(req, res, next) {
  if (safeMethods.has(req.method)) return next();

  const hasBearer = Boolean(req.headers.authorization?.startsWith("Bearer "));
  const usesCookieSession = Boolean(req.cookies?.[refreshCookieName]);
  // Bearer SPA auth does not need double-submit CSRF; cookie-only sessions do.
  if (!usesCookieSession || hasBearer) return next();

  const cookieToken = req.cookies?.[csrfCookieName];
  const headerToken = req.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "CSRF token is invalid or missing"));
  }
  next();
}

function applyBaseSecurity(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );
  app.use(compression());
  app.use(cookieParser(cookieSecret));
}

module.exports = {
  applyBaseSecurity,
  apiRateLimiter,
  authRateLimiter,
  csrfProtection,
  generateCsrfToken,
  sanitizeRequest,
};
