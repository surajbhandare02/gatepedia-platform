const profileService = require("../services/profileService");

async function getProfile(req, res, next) {
  try {
    const data = await profileService.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateProfile(req, res, next) {
  try {
    const data = await profileService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { getProfile, updateProfile };
