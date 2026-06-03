const prisma = require("../prismaClient");
const { HttpError } = require("../middleware/errorHandler");

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.setHours(0, 0, 0, 0));
}

async function createFlashcard(userId, payload) {
  if (!payload.front || !payload.back) {
    throw new HttpError(400, "Front and back content are required");
  }

  return await prisma.flashcards.create({
    data: {
      user_id: userId,
      topic_id: payload.topic_id ? parseInt(payload.topic_id) : null,
      front: payload.front,
      back: payload.back,
      difficulty: "medium",
      next_review_date: new Date()
    }
  });
}

async function listFlashcards(userId, topicId = null) {
  const where = { user_id: userId };
  if (topicId) {
    where.topic_id = parseInt(topicId);
  }

  return await prisma.flashcards.findMany({
    where,
    orderBy: { created_at: 'desc' }
  });
}

async function getDueFlashcards(userId) {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  
  return await prisma.flashcards.findMany({
    where: {
      user_id: userId,
      next_review_date: { lte: today }
    },
    orderBy: { next_review_date: 'asc' }
  });
}

async function reviewFlashcard(userId, flashcardId, difficulty) {
  const flashcard = await prisma.flashcards.findUnique({
    where: { id: parseInt(flashcardId) }
  });

  if (!flashcard || flashcard.user_id !== userId) {
    throw new HttpError(404, "Flashcard not found");
  }

  // Basic spaced repetition logic based on difficulty (easy/medium/hard)
  let daysToAdd = 1;
  if (difficulty === "easy") {
    daysToAdd = 7;
  } else if (difficulty === "medium") {
    daysToAdd = 3;
  } else {
    daysToAdd = 1; // "hard" -> review tomorrow
  }

  return await prisma.flashcards.update({
    where: { id: parseInt(flashcardId) },
    data: {
      difficulty,
      next_review_date: addDays(daysToAdd)
    }
  });
}

async function deleteFlashcard(userId, flashcardId) {
  const flashcard = await prisma.flashcards.findUnique({
    where: { id: parseInt(flashcardId) }
  });

  if (!flashcard || flashcard.user_id !== userId) {
    throw new HttpError(404, "Flashcard not found");
  }

  await prisma.flashcards.delete({
    where: { id: parseInt(flashcardId) }
  });

  return { deleted: true };
}

module.exports = {
  createFlashcard,
  listFlashcards,
  getDueFlashcards,
  reviewFlashcard,
  deleteFlashcard,
};
