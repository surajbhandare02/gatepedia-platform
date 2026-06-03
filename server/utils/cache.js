const { createClient } = require("redis");
const { redisUrl } = require("../config/env");
const logger = require("./logger");

const memory = new Map();
let redisClient = null;
let redisReady = false;

let errorLogged = false;

async function connectCache() {
  if (!redisUrl || redisClient || process.env.NODE_ENV === "test") return;

  redisClient = createClient({
    url: redisUrl,
    socket: { reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 2000)) },
  });
  
  redisClient.on("error", (error) => {
    redisReady = false;
    if (!errorLogged) {
      logger.warn("Redis cache unavailable, using memory fallback", {
        error: error.message,
      });
      errorLogged = true;
    }
  });
  redisClient.on("ready", () => {
    redisReady = true;
    logger.info("Redis cache connected");
  });

  try {
    await redisClient.connect();
  } catch (error) {
    redisReady = false;
    logger.warn("Redis cache connection failed", { error: error.message });
  }
}

function getMemory(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt && hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function setMemory(key, value, ttlSeconds) {
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

async function getJSON(key) {
  if (redisReady) {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }
  return getMemory(key);
}

async function setJSON(key, value, ttlSeconds = 60) {
  if (redisReady) {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  setMemory(key, value, ttlSeconds);
}

async function getOrSet(key, ttlSeconds, factory) {
  const cached = await getJSON(key);
  if (cached !== null) return cached;
  const value = await factory();
  await setJSON(key, value, ttlSeconds);
  return value;
}

async function health() {
  if (!redisUrl) return { enabled: false, status: "not_configured" };
  if (!redisReady) return { enabled: true, status: "degraded" };
  await redisClient.ping();
  return { enabled: true, status: "ok" };
}

function getRedisClient() {
  return redisClient;
}

module.exports = {
  connectCache,
  getRedisClient,
  getJSON,
  setJSON,
  getOrSet,
  health,
};
