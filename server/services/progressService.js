const { HttpError } = require("../middleware/errorHandler");
const prisma = require("../prismaClient");

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

async function getAccessibleTopic(topicId, userId) {
  if (!topicId) return null;
  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      subject: {
        OR: [
          { user_id: null },
          { user_id: userId || null }
        ]
      }
    },
    include: { subject: true }
  });
  return topic ? { id: topic.id, title: topic.title, subject: topic.subject.name } : null;
}

async function listProgress({ filters = {}, userId = null }) {
  const { subject, q, from, to } = filters;

  const where = {};
  if (userId) {
    // Authenticated users only see their own sessions (multi-tenant isolation).
    where.user_id = userId;
  } else {
    // Legacy unauthenticated API: only anonymous rows (pre-auth migration data).
    where.user_id = null;
  }
  if (subject) {
    where.subject = subject;
  }
  if (q && String(q).trim()) {
    where.topic = { contains: String(q).trim(), mode: "insensitive" };
  }
  if (from || to) {
    where.study_date = {};
    if (from) where.study_date.gte = new Date(from);
    if (to) where.study_date.lte = new Date(to);
  }

  const result = await prisma.progress.findMany({
    where,
    orderBy: [
      { study_date: 'desc' },
      { id: 'desc' }
    ]
  });

  return result.map(p => ({
    id: p.id,
    user_id: p.user_id,
    topic_id: p.topic_id,
    subject: p.subject,
    topic: p.topic,
    study_hours: Number(p.study_hours),
    study_date: normalizeDate(p.study_date),
    confidence_level: p.confidence_level,
    difficulty_level: p.difficulty_level,
    need_more_study: p.need_more_study
  }));
}

async function createProgress(payload, userId = null) {
  const topicInfo = await getAccessibleTopic(payload.topic_id, userId);
  const subject = topicInfo?.subject || String(payload.subject || "").trim();
  const topic = topicInfo?.title || String(payload.topic || "").trim();
  const studyDate = normalizeDate(payload.study_date);
  const hours = numberOr(payload.study_hours, NaN);
  const confidence = Math.min(5, Math.max(1, numberOr(payload.confidence_level, 3)));
  const difficulty = payload.difficulty_level || "medium";

  if (!subject || !topic || !studyDate) {
    throw new HttpError(400, "subject, topic, and study_date are required");
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new HttpError(400, "study_hours must be a non-negative number");
  }

  const progress = await prisma.$transaction(async (tx) => {
    const p = await tx.progress.create({
      data: {
        user_id: userId,
        topic_id: topicInfo?.id || payload.topic_id || null,
        subject,
        topic,
        study_hours: hours,
        study_date: new Date(studyDate),
        confidence_level: confidence,
        difficulty_level: difficulty,
        need_more_study: Boolean(payload.need_more_study)
      }
    });

    if (topicInfo?.id && userId) {
      await tx.topic_progress.upsert({
        where: {
          user_id_topic_id: {
            user_id: userId,
            topic_id: topicInfo.id
          }
        },
        update: {
          study_hours: { increment: hours },
          confidence_level: confidence,
          difficulty_level: difficulty,
          need_more_study: Boolean(payload.need_more_study),
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          topic_id: topicInfo.id,
          study_hours: hours,
          confidence_level: confidence,
          difficulty_level: difficulty,
          need_more_study: Boolean(payload.need_more_study)
        }
      });
    }
    return p;
  });

  return {
    ...progress,
    study_hours: Number(progress.study_hours),
    study_date: normalizeDate(progress.study_date)
  };
}

async function assertProgressAccess(id, userId) {
  const existing = await prisma.progress.findFirst({
    where: userId
      ? { id, user_id: userId }
      : { id, user_id: null },
  });
  if (!existing) {
    throw new HttpError(404, "Progress entry not found");
  }
  return existing;
}

async function updateProgress(id, payload, userId = null) {
  const topicInfo = await getAccessibleTopic(payload.topic_id, userId);
  const subject = topicInfo?.subject || String(payload.subject || "").trim();
  const topic = topicInfo?.title || String(payload.topic || "").trim();
  const studyDate = normalizeDate(payload.study_date);
  const hours = numberOr(payload.study_hours, NaN);
  const confidence = Math.min(5, Math.max(1, numberOr(payload.confidence_level, 3)));
  const difficulty = payload.difficulty_level || "medium";

  if (!subject || !topic || !studyDate) {
    throw new HttpError(400, "subject, topic, and study_date are required");
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new HttpError(400, "study_hours must be a non-negative number");
  }

  await assertProgressAccess(id, userId);

  try {
    const updated = await prisma.progress.update({
      where: { id },
      data: {
        subject,
        topic,
        study_hours: hours,
        study_date: new Date(studyDate),
        topic_id: topicInfo?.id || payload.topic_id || null,
        confidence_level: confidence,
        difficulty_level: difficulty,
        need_more_study: Boolean(payload.need_more_study)
      }
    });

    return {
      ...updated,
      study_hours: Number(updated.study_hours),
      study_date: normalizeDate(updated.study_date)
    };
  } catch (e) {
    if (e.code === 'P2025') {
      throw new HttpError(404, "Progress entry not found");
    }
    throw e;
  }
}

async function deleteProgress(id, userId = null) {
  await assertProgressAccess(id, userId);
  try {
    await prisma.progress.delete({ where: { id } });
    return { id };
  } catch (e) {
    if (e.code === "P2025") {
      throw new HttpError(404, "Progress entry not found");
    }
    throw e;
  }
}

module.exports = {
  listProgress,
  createProgress,
  updateProgress,
  deleteProgress,
};
