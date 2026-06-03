const progressService = require("../services/progressService");

async function listProgress(req, res, next) {
  try {
    const data = await progressService.listProgress({
      filters: req.query,
      userId: req.user?.id || null,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function createProgress(req, res, next) {
  try {
    const data = await progressService.createProgress(
      req.body,
      req.user?.id || null
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateProgress(req, res, next) {
  try {
    const data = await progressService.updateProgress(
      req.params.id,
      req.body,
      req.user?.id || null
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function deleteProgress(req, res, next) {
  try {
    const data = await progressService.deleteProgress(
      req.params.id,
      req.user?.id || null
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listProgress,
  createProgress,
  updateProgress,
  deleteProgress,
};
