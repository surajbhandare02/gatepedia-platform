const syllabusService = require("../services/syllabusService");

async function listSubjects(req, res, next) {
  try {
    const data = await syllabusService.getSubjects(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateTopicProgress(req, res, next) {
  try {
    const data = await syllabusService.updateTopicProgress(
      req.user.id,
      req.params.topicId,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updatePyq(req, res, next) {
  try {
    const data = await syllabusService.updatePyq(
      req.user.id,
      req.params.topicId,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateNotes(req, res, next) {
  try {
    const data = await syllabusService.updateNotes(
      req.user.id,
      req.params.topicId,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function updateWeakTopic(req, res, next) {
  try {
    const data = await syllabusService.updateWeakTopic(
      req.user.id,
      req.params.topicId,
      req.body
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function createRevision(req, res, next) {
  try {
    const data = await syllabusService.createRevision(
      req.user.id,
      req.params.topicId,
      req.body
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listSubjects,
  updateTopicProgress,
  updatePyq,
  updateNotes,
  updateWeakTopic,
  createRevision,
};
