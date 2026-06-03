const productivityService = require("../services/productivityService");

async function dashboard(req, res, next) {
  try {
    const data = await productivityService.getProductivityDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function createGoal(req, res, next) {
  try {
    const data = await productivityService.createGoal(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateGoal(req, res, next) {
  try {
    const data = await productivityService.updateGoal(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function createFocusSession(req, res, next) {
  try {
    const data = await productivityService.createFocusSession(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function completeFocusSession(req, res, next) {
  try {
    const data = await productivityService.completeFocusSession(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  dashboard,
  createGoal,
  updateGoal,
  createFocusSession,
  completeFocusSession,
};
