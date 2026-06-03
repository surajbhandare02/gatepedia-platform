const prisma = require("../prismaClient");
const { HttpError } = require("../middleware/errorHandler");

/* =========================
   Utility Functions
========================= */

function toNumber(value, fallback = 0) {
  return Number(value || fallback);
}

function levelFromXp(xp) {
  return Math.max(
    1,
    Math.floor(Math.sqrt(toNumber(xp) / 100)) + 1
  );
}

/* =========================
   Streak Management
========================= */

async function getOrCreateStreak(userId) {
  const streak = await prisma.streaks.upsert({
    where: { user_id: userId },
    update: { updated_at: new Date() },
    create: { user_id: userId }
  });

  return {
    current_streak: streak.current_streak,
    longest_streak: streak.longest_streak,
    last_activity_date: streak.last_activity_date ? streak.last_activity_date.toISOString().split('T')[0] : null,
    xp_points: streak.xp_points,
    level: streak.level
  };
}

/* =========================
   Statistics
========================= */

async function getUserStats(userId) {
  const [sessions, completed_topics, pyqData, revisions, activeDaysData] = await Promise.all([
    prisma.progress.count({ where: { user_id: userId } }),
    prisma.topic_progress.count({ where: { user_id: userId, completed: true } }),
    prisma.pyq_tracking.aggregate({
      where: { user_id: userId },
      _sum: { solved_count: true }
    }),
    prisma.revisions.count({ where: { user_id: userId } }),
    prisma.progress.groupBy({
      by: ['study_date'],
      where: { user_id: userId },
    })
  ]);

  return {
    sessions,
    completed_topics,
    pyqs: pyqData._sum.solved_count || 0,
    revisions,
    active_days: activeDaysData.length
  };
}

/* =========================
   XP Calculation
========================= */

function calculateXp(stats) {
  return (
    toNumber(stats.sessions) * 25 +
    toNumber(stats.completed_topics) * 40 +
    toNumber(stats.pyqs) * 5 +
    toNumber(stats.revisions) * 30 +
    toNumber(stats.active_days) * 20
  );
}

/* =========================
   Achievement System
========================= */

const achievementRules = [
  {
    code: "FIRST_SESSION",
    condition: (s) => toNumber(s.sessions) >= 1,
  },
  {
    code: "THREE_DAY_STREAK",
    condition: (s) => toNumber(s.active_days) >= 3,
  },
  {
    code: "TEN_TOPICS_DONE",
    condition: (s) => toNumber(s.completed_topics) >= 10,
  },
  {
    code: "FIFTY_PYQS",
    condition: (s) => toNumber(s.pyqs) >= 50,
  },
  {
    code: "REVISION_READY",
    condition: (s) => toNumber(s.revisions) >= 5,
  },
];

async function unlockAchievements(userId, stats) {
  const unlockedCodes = achievementRules
    .filter((rule) => rule.condition(stats))
    .map((rule) => rule.code);

  if (unlockedCodes.length === 0) return;

  const achievements = await prisma.achievements.findMany({
    where: { code: { in: unlockedCodes } }
  });

  for (const ach of achievements) {
    try {
      await prisma.user_achievements.create({
        data: {
          user_id: userId,
          achievement_id: ach.id
        }
      });
    } catch (e) {
      // Ignore unique constraint violations if already unlocked
    }
  }
}

/* =========================
   Gamification Refresh
========================= */

async function refreshGamification(userId) {
  const stats = await getUserStats(userId);
  const xp = calculateXp(stats);
  const level = levelFromXp(xp);

  const existingStreak = await getOrCreateStreak(userId);
  const newStreak = Math.max(existingStreak.current_streak, toNumber(stats.active_days));

  await prisma.streaks.update({
    where: { user_id: userId },
    data: {
      xp_points: xp,
      level: level,
      current_streak: newStreak,
      longest_streak: Math.max(existingStreak.longest_streak, newStreak),
      updated_at: new Date()
    }
  });

  await unlockAchievements(userId, stats);

  const userAchievements = await prisma.user_achievements.findMany({
    where: { user_id: userId },
    include: { achievements: true },
    orderBy: { unlocked_at: 'desc' }
  });

  const formattedAchievements = userAchievements.map(ua => ({
    code: ua.achievements.code,
    title: ua.achievements.title,
    description: ua.achievements.description,
    xp_reward: ua.achievements.xp_reward,
    badge_type: ua.achievements.badge_type,
    unlocked_at: ua.unlocked_at
  }));

  const streak = await getOrCreateStreak(userId);

  return {
    ...streak,
    xp_points: xp,
    level,
    achievements: formattedAchievements,
  };
}

/* =========================
   Goals
========================= */

async function createGoal(userId, payload) {
  return await prisma.goal.create({
    data: {
      user_id: userId,
      title: payload.title || "Study Goal",
      goal_type: payload.goal_type || "weekly",
      target_value: toNumber(payload.target_value),
      unit: payload.unit || "hours",
      start_date: payload.start_date ? new Date(payload.start_date) : new Date(),
      due_date: payload.due_date ? new Date(payload.due_date) : null
    }
  });
}

async function listGoals(userId) {
  return await prisma.goal.findMany({
    where: { user_id: userId },
    orderBy: [
      { status: 'asc' },
      { due_date: 'asc' },
      { created_at: 'desc' }
    ]
  });
}

async function updateGoal(userId, goalId, payload) {
  return await prisma.goal.update({
    where: { id: parseInt(goalId), user_id: userId },
    data: {
      title: payload.title,
      target_value: payload.target_value !== undefined ? toNumber(payload.target_value) : undefined,
      current_value: payload.current_value !== undefined ? toNumber(payload.current_value) : undefined,
      status: payload.status
    }
  });
}

/* =========================
   Focus Sessions
========================= */

async function createFocusSession(userId, payload) {
  return await prisma.focus_sessions.create({
    data: {
      user_id: userId,
      topic_id: payload.topic_id ? parseInt(payload.topic_id) : null,
      mode: payload.mode || "pomodoro",
      focus_minutes: toNumber(payload.focus_minutes, 25),
      break_minutes: toNumber(payload.break_minutes, 5),
      cycles: toNumber(payload.cycles, 1),
      status: payload.status || "active",
      started_at: new Date()
    }
  });
}

async function completeFocusSession(userId, sessionId, payload) {
  const session = await prisma.focus_sessions.findUnique({
    where: { id: parseInt(sessionId) }
  });

  if (!session || session.user_id !== userId) {
    throw new HttpError(404, "Focus session not found");
  }

  const completedCycles = toNumber(payload.completed_cycles, session.cycles);
  
  return await prisma.focus_sessions.update({
    where: { id: parseInt(sessionId) },
    data: {
      status: "completed",
      completed_cycles: completedCycles,
      ended_at: new Date()
    }
  });
}

/* =========================
   Dashboard
========================= */

async function getProductivityDashboard(userId) {
  const [goals, focus_sessions, gamification] = await Promise.all([
    listGoals(userId),
    prisma.focus_sessions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 12
    }),
    refreshGamification(userId)
  ]);

  const deepWorkMinutes = focus_sessions.reduce(
    (sum, item) => sum + (toNumber(item.focus_minutes) * toNumber(item.completed_cycles)),
    0
  );

  return {
    goals,
    focus_sessions,
    deep_work_minutes: deepWorkMinutes,
    gamification,
  };
}

module.exports = {
  refreshGamification,
  createGoal,
  listGoals,
  updateGoal,
  createFocusSession,
  completeFocusSession,
  getProductivityDashboard,
};