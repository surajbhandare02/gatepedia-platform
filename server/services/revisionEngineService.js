const prisma = require("../prismaClient");
const { HttpError } = require("../middleware/errorHandler");

const INTERVALS = [1, 3, 7, 14, 30, 60];

function ymd(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.setHours(0, 0, 0, 0));
}

async function generateRevisionSchedule(userId) {
  // Find topics that are completed, hard, or need more study
  const topicsToRevise = await prisma.topic.findMany({
    where: {
      subject: {
        OR: [
          { user_id: null },
          { user_id: userId }
        ]
      },
      topic_progress: {
        some: {
          user_id: userId,
          OR: [
            { completed: true },
            { need_more_study: true },
            { difficulty_level: 'hard' }
          ]
        }
      }
    },
    include: {
      topic_progress: {
        where: { user_id: userId }
      }
    }
  });

  let inserted = 0;

  for (const topic of topicsToRevise) {
    const tp = topic.topic_progress[0] || {};
    const boost = (tp.need_more_study || tp.difficulty_level === "hard" || (tp.confidence_level || 3) <= 2) ? -1 : 0;
    
    for (let index = 0; index < INTERVALS.length; index++) {
      const interval = Math.max(1, INTERVALS[index] + boost);
      
      try {
        await prisma.revision_schedule.upsert({
          where: {
            user_id_topic_id_revision_stage: {
              user_id: userId,
              topic_id: topic.id,
              revision_stage: index + 1
            }
          },
          update: {},
          create: {
            user_id: userId,
            topic_id: topic.id,
            revision_stage: index + 1,
            due_date: addDays(interval),
            interval_days: interval,
            status: 'planned'
          }
        });
        inserted++;
      } catch (e) {
        // Ignore unique constraint violations
      }
    }
  }

  return { scheduled_count: inserted };
}

async function getRevisionCalendar(userId) {
  const calendarItems = await prisma.revision_schedule.findMany({
    where: { user_id: userId },
    include: {
      topics: {
        include: {
          subject: true,
          topic_progress: {
            where: { user_id: userId }
          }
        }
      }
    },
    orderBy: [
      { due_date: 'asc' },
      { revision_stage: 'asc' }
    ],
    take: 180
  });

  const todayStr = ymd(new Date());
  
  const mappedItems = calendarItems.map(item => ({
    id: item.id,
    topic_id: item.topic_id,
    title: item.topics.title,
    subject: item.topics.subject.name,
    revision_stage: item.revision_stage,
    due_date: ymd(item.due_date),
    status: item.status,
    interval_days: item.interval_days,
    confidence_level: item.topics.topic_progress[0]?.confidence_level || 3
  }));

  return {
    due_today: mappedItems.filter((item) => item.due_date <= todayStr && item.status !== "completed"),
    upcoming: mappedItems.filter((item) => item.due_date > todayStr && item.status !== "completed"),
    calendar: mappedItems,
  };
}

async function completeRevision(userId, scheduleId, payload = {}) {
  const existing = await prisma.revision_schedule.findFirst({
    where: { id: parseInt(scheduleId), user_id: userId }
  });

  if (!existing) {
    throw new HttpError(404, "Revision item not found");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark completed
    await tx.revision_schedule.update({
      where: { id: existing.id },
      data: {
        status: 'completed',
        last_revised_at: new Date(),
        updated_at: new Date()
      }
    });

    // 2. Add revision log
    await tx.revisions.create({
      data: {
        user_id: userId,
        topic_id: existing.topic_id,
        revision_date: new Date(),
        hours: Number(payload.hours || 0),
        notes: String(payload.notes || "")
      }
    });

    // 3. Plan next stage
    const nextStage = Number(existing.revision_stage) + 1;
    const nextInterval = INTERVALS[Math.min(nextStage - 1, INTERVALS.length - 1)];

    await tx.revision_schedule.upsert({
      where: {
        user_id_topic_id_revision_stage: {
          user_id: userId,
          topic_id: existing.topic_id,
          revision_stage: nextStage
        }
      },
      update: {},
      create: {
        user_id: userId,
        topic_id: existing.topic_id,
        revision_stage: nextStage,
        due_date: addDays(nextInterval),
        interval_days: nextInterval,
        status: 'planned'
      }
    });
  });

  return { completed: true };
}

module.exports = {
  generateRevisionSchedule,
  getRevisionCalendar,
  completeRevision,
};
