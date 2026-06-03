const express = require("express");
const http = require("http");
const cors = require("cors");
const { port, clientOrigin } = require("./config/env");
const apiRoutes = require("./routes/api");
const healthController = require("./controllers/healthController");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/requestLogger");
const {
  apiRateLimiter,
  applyBaseSecurity,
  csrfProtection,
  sanitizeRequest,
} = require("./middleware/securityMiddleware");
const { configureRealtime } = require("./realtime/socket");
const cache = require("./utils/cache");
const logger = require("./utils/logger");

const app = express();

applyBaseSecurity(app);
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  })
);
app.use(apiRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeRequest);
app.use(csrfProtection);
app.use(requestLogger);

/** Lightweight health check for deploys and debugging */
app.get("/health", healthController.basic);
app.get("/ready", healthController.deep); // Alias for deep check
app.get("/version", healthController.version);

app.use("/api", apiRoutes);
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

/**
 * Legacy route names — still supported but require authentication.
 * Prevents unauthenticated reads/writes of study data in production.
 */
const progressController = require("./controllers/progressController");
const { requireAuth } = require("./middleware/authMiddleware");
app.get("/progress", requireAuth, progressController.listProgress);
app.post("/add-progress", requireAuth, progressController.createProgress);
app.put("/update-progress/:id", requireAuth, progressController.updateProgress);
app.delete("/delete-progress/:id", requireAuth, progressController.deleteProgress);

app.use(errorHandler);

const server = http.createServer(app);
configureRealtime(server);
if (process.env.NODE_ENV !== "test") {
  cache.connectCache();
}

if (require.main === module) {
  server.listen(port, () => {
    logger.info(`API listening on http://localhost:${port}`);
  });
}

module.exports = { app, server };
