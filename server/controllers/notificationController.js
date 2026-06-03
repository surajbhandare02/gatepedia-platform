const notificationService = require("../services/notificationService");

async function list(req, res, next) {
  try {
    const data = await notificationService.listNotifications(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function markRead(req, res, next) {
  try {
    const data = await notificationService.markNotificationRead(
      req.user.id,
      req.params.id
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, markRead };
