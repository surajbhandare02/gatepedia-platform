const winston = require("winston");
const { nodeEnv } = require("../config/env");

const redact = winston.format((info) => {
  const clone = { ...info };
  for (const key of ["password", "token", "refreshToken", "authorization"]) {
    if (clone[key]) clone[key] = "[redacted]";
  }
  return clone;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug"),
  defaultMeta: { service: "gate-progress-api" },
  format: winston.format.combine(
    redact(),
    winston.format.timestamp(),
    nodeEnv === "production"
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
