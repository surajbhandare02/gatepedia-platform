const logger = require("../utils/logger");
const { ZodError } = require("zod");

/**
 * Express error middleware — keeps API errors consistent for the React app.
 * Standard response: { success: false, message: string, errors?: array }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || (status === 500 ? "Internal server error" : "Error");
  let errors = undefined;

  // Handle Zod Validation Errors gracefully
  if (err instanceof ZodError) {
    status = 400;
    message = "Validation Error";
    errors = (err.issues || err.errors || []).map((e) => ({
      path: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
      message: e.message,
    }));
  }

  if (status >= 500) {
    logger.error("api_error", {
      message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      user_id: req.user?.id,
    });
  }

  res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, HttpError };
