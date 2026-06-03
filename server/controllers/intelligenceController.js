const aiService = require("../services/aiService");

async function getPlanner(req, res, next) {
  try {
    const data = await aiService.enhancePlanner(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function getPerformanceInsights(req, res, next) {
  try {
    const data = await aiService.enhancePerformance(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function getPyqAnalyzer(req, res, next) {
  try {
    const data = await aiService.enhancePyq(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getPlanner,
  getPerformanceInsights,
  getPyqAnalyzer,
};
