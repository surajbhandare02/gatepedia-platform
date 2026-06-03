const analyticsService = require("../services/analyticsService");

async function getAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getAnalytics(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { getAnalytics };
