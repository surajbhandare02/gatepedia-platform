const flashcardService = require("../services/flashcardService");

async function createFlashcard(req, res, next) {
  try {
    const data = await flashcardService.createFlashcard(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function listFlashcards(req, res, next) {
  try {
    const data = await flashcardService.listFlashcards(req.user.id, req.query.topic_id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function getDueFlashcards(req, res, next) {
  try {
    const data = await flashcardService.getDueFlashcards(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function reviewFlashcard(req, res, next) {
  try {
    const data = await flashcardService.reviewFlashcard(req.user.id, req.params.id, req.body.difficulty);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function deleteFlashcard(req, res, next) {
  try {
    const data = await flashcardService.deleteFlashcard(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createFlashcard,
  listFlashcards,
  getDueFlashcards,
  reviewFlashcard,
  deleteFlashcard,
};
