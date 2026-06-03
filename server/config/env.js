/**
 * Central place for environment variables (12-factor style).
 * Defaults keep local development working without a .env file.
 */
require("dotenv").config();

const toInt = (value, fallback) => {
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || "development";
const defaultSecrets = [
  "change-this-secret-in-production-gate-progress-system",
  "change-this-refresh-secret-in-production-gate-progress-system",
  "change-this-cookie-secret-in-production-gate-progress-system",
];

if (
  nodeEnv === "production" &&
  defaultSecrets.some(
    (s) =>
      process.env.JWT_SECRET === s ||
      process.env.JWT_REFRESH_SECRET === s ||
      process.env.COOKIE_SECRET === s ||
      !process.env.JWT_SECRET ||
      !process.env.JWT_REFRESH_SECRET ||
      !process.env.COOKIE_SECRET
  )
) {
  throw new Error(
    "Set JWT_SECRET, JWT_REFRESH_SECRET, and COOKIE_SECRET before running in production."
  );
}

module.exports = {
  nodeEnv,
  port: toInt(process.env.PORT, 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "https://gateopedia.vercel.app",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  jwtSecret:
    process.env.JWT_SECRET ||
    "change-this-secret-in-production-gate-progress-system",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    "change-this-refresh-secret-in-production-gate-progress-system",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  cookieSecret:
    process.env.COOKIE_SECRET ||
    "change-this-cookie-secret-in-production-gate-progress-system",
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "gate_csrf",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "gate_refresh_token",
  redisUrl: process.env.REDIS_URL || "",
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  },
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 600),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 30),
  },
  upload: {
    maxPdfMb: toInt(process.env.MAX_PDF_UPLOAD_MB, 10),
  },
  db: {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "gate_progress",
    password: process.env.PGPASSWORD || "root",
    port: toInt(process.env.PGPORT, 5432),
    max: toInt(process.env.PGPOOL_MAX, 10),
    idleTimeoutMillis: toInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 5000),
    ssl:
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined,
  },
};
