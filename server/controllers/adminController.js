const adminService = require("../services/adminService");

async function overview(req, res, next) {
  try {
    const data = await adminService.overview(req.user);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { overview };
