const aiService = require("../services/aiService");

async function explainTopic(req, res, next) {
  try {
    const data = await aiService.explainTopic(req.user.id, req.params.topicId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function generateQuiz(req, res, next) {
  try {
    const data = await aiService.generateQuiz(req.user.id, req.params.topicId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function generateFlashcards(req, res, next) {
  try {
    const data = await aiService.generateFlashcards(req.user.id, req.params.topicId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function recommendations(req, res, next) {
  try {
    const data = await aiService.recommendations(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function summarizeNotes(req, res, next) {
  try {
    const text = req.body.text || "";
    if (!text || text.length < 50) {
      return res.status(400).json({ success: false, message: "Text is too short to summarize" });
    }
    const data = await aiService.summarizeNotes(req.user.id, text);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  explainTopic,
  generateQuiz,
  generateFlashcards,
  recommendations,
  summarizeNotes,
};
