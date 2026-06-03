const assistantService = require("../services/assistantService");

async function chat(req, res, next) {
  try {
    const data = await assistantService.chat(req.user.id, req.body.message);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function history(req, res, next) {
  try {
    const data = await assistantService.history(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { chat, history };
