const revisionEngineService = require("../services/revisionEngineService");

async function generateSchedule(req, res, next) {
  try {
    const data = await revisionEngineService.generateRevisionSchedule(req.user.id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function getCalendar(req, res, next) {
  try {
    const data = await revisionEngineService.getRevisionCalendar(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function completeRevision(req, res, next) {
  try {
    const data = await revisionEngineService.completeRevision(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { generateSchedule, getCalendar, completeRevision };
