const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { HttpError } = require("./errorHandler");

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function attachUserFromToken(req) {
  const token = readBearerToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || "student",
    };
    return req.user;
  } catch {
    throw new HttpError(401, "Session expired. Please log in again.");
  }
}

function requireAuth(req, res, next) {
  try {
    const user = attachUserFromToken(req);
    if (!user) {
      throw new HttpError(401, "Login required");
    }
    next();
  } catch (e) {
    next(e);
  }
}

function optionalAuth(req, res, next) {
  try {
    attachUserFromToken(req);
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireAuth, optionalAuth };
