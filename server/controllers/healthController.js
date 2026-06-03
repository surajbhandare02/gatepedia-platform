const pool = require("../db");
const cache = require("../utils/cache");
const metrics = require("../utils/metrics");

async function basic(req, res) {
  res.json({ success: true, status: "up", service: "gate-progress-api" });
}

async function version(req, res) {
  res.json({ success: true, version: process.env.npm_package_version || "1.0.0" });
}

async function deep(req, res, next) {
  try {
    await pool.query("SELECT 1");
    const cacheHealth = await cache.health();
    const degraded = cacheHealth.enabled && cacheHealth.status !== "ok";
    res.status(degraded ? 207 : 200).json({
      success: true,
      service: "gate-progress-api",
      checks: {
        database: "ok",
        cache: cacheHealth,
      },
    });
  } catch (error) {
    next(error);
  }
}

function getMetrics(req, res) {
  res.json({ success: true, data: metrics.snapshot() });
}

module.exports = { basic, deep, version, getMetrics };
