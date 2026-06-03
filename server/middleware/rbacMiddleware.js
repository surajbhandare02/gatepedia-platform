const { HttpError } = require("./errorHandler");

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role || "student";
    if (!roles.includes(role)) {
      return next(new HttpError(403, "You do not have permission for this action"));
    }
    next();
  };
}

module.exports = { requireRole };
