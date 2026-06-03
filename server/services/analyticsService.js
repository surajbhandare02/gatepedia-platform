const pool = require("../db");

function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function yesterdayFrom(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x;
}

function computeStreak(sortedDescDates) {
  if (!sortedDescDates.length) return 0;

  const today = formatYMD(new Date());
  const set = new Set(sortedDescDates);
  let expected = today;

  if (!set.has(today)) {
    const yesterday = formatYMD(yesterdayFrom(new Date()));
    if (!set.has(yesterday)) return 0;
    expected = yesterday;
  }

  let streak = 0;
  let cursor = parseYMD(expected);
  while (set.has(formatYMD(cursor))) {
    streak += 1;
    cursor = yesterdayFrom(cursor);
  }
  return streak;
}

function lastNDaysSeries(heatmap, n) {
  const map = new Map(heatmap.map((h) => [h.date, h.hours || h.count || 0]));
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatYMD(d);
    out.push({
      label: key.slice(5),
      day: key,
      hours: map.get(key) || 0,
    });
  }
  return out;
}

function progressScope(userId) {
  if (!userId) {
    return { where: "WHERE user_id IS NULL", values: [] };
  }
  return {
    where: "WHERE user_id = $1",
    values: [userId],
  };
}

async function getAnalytics(userId) {
  const scope = progressScope(userId);
  const [
    totals,
    sessionBySubject,
    topicBySubject,
    byDay,
    distinctDates,
    syllabusSummary,
    pyqSummary,
    revisionHeatmap,
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(study_hours::numeric), 0)::float AS total_hours,
              COUNT(*)::int AS total_sessions
       FROM progress
       ${scope.where}`,
      scope.values
    ),
    pool.query(
      `SELECT subject,
              COALESCE(SUM(study_hours::numeric), 0)::float AS hours,
              COUNT(*)::int AS sessions
       FROM progress
       ${scope.where}
       GROUP BY subject
       ORDER BY hours DESC`,
      scope.values
    ),
    pool.query(
      `SELECT s.name AS subject,
              COUNT(t.id)::int AS topic_count,
              COUNT(tp.topic_id) FILTER (WHERE tp.completed)::int AS completed_topics,
              COALESCE(SUM(tp.study_hours), 0)::float AS topic_hours,
              COALESCE(SUM(pyq.solved_count), 0)::int AS pyq_solved,
              COUNT(wt.topic_id) FILTER (
                WHERE wt.is_hard OR wt.is_weak OR wt.needs_revision OR wt.high_priority
              )::int AS weak_count
       FROM subjects s
       LEFT JOIN topics t ON t.subject_id = s.id
       LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
       LEFT JOIN pyq_tracking pyq ON pyq.topic_id = t.id AND pyq.user_id = $1
       LEFT JOIN weak_topics wt ON wt.topic_id = t.id AND wt.user_id = $1
       WHERE (s.user_id IS NULL OR s.user_id = $1)
       GROUP BY s.id, s.name, s.display_order
       ORDER BY s.display_order ASC, s.name ASC`,
      [userId]
    ),
    pool.query(
      `SELECT study_date::text AS day,
              COALESCE(SUM(study_hours::numeric), 0)::float AS hours
       FROM progress
       ${scope.where}
         AND study_date >= (CURRENT_DATE - INTERVAL '89 days')
       GROUP BY study_date
       ORDER BY study_date`,
      scope.values
    ),
    pool.query(
      `SELECT DISTINCT study_date::text AS d
       FROM progress
       ${scope.where}
       ORDER BY d DESC`,
      scope.values
    ),
    pool.query(
      `SELECT COUNT(t.id)::int AS total_topics,
              COUNT(tp.topic_id) FILTER (WHERE tp.completed)::int AS completed_topics,
              COUNT(tp.topic_id) FILTER (WHERE tp.need_more_study)::int AS need_more_study,
              COALESCE(AVG(tp.confidence_level), 0)::float AS average_confidence,
              COALESCE(SUM(tp.study_hours), 0)::float AS topic_hours
       FROM subjects s
       JOIN topics t ON t.subject_id = s.id
       LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
       WHERE (s.user_id IS NULL OR s.user_id = $1)`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(solved_count), 0)::int AS solved,
              COALESCE(SUM(attempted_count), 0)::int AS attempted,
              COALESCE(SUM(correct_count), 0)::int AS correct
       FROM pyq_tracking
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT revision_date::text AS date,
              COUNT(*)::int AS count,
              COALESCE(SUM(hours), 0)::float AS hours
       FROM revisions
       WHERE user_id = $1
         AND revision_date >= (CURRENT_DATE - INTERVAL '89 days')
       GROUP BY revision_date
       ORDER BY revision_date`,
      [userId]
    ),
  ]);

  const sessionMap = new Map(
    sessionBySubject.rows.map((row) => [row.subject, row])
  );
  const bySubject = topicBySubject.rows.map((row) => {
    const session = sessionMap.get(row.subject) || {};
    const topicCount = row.topic_count || 0;
    const completed = row.completed_topics || 0;
    return {
      subject: row.subject,
      hours: session.hours || row.topic_hours || 0,
      sessions: session.sessions || 0,
      topic_count: topicCount,
      completed_topics: completed,
      completion_percentage:
        topicCount === 0 ? 0 : Math.round((completed / topicCount) * 100),
      pyq_solved: row.pyq_solved || 0,
      weak_count: row.weak_count || 0,
    };
  });

  const totalHours = totals.rows[0].total_hours;
  const totalSessions = totals.rows[0].total_sessions;
  const streak = computeStreak(distinctDates.rows.map((r) => r.d));
  const heatmap = byDay.rows.map((r) => ({
    date: r.day,
    hours: r.hours,
  }));
  const todayHours =
    new Map(heatmap.map((h) => [h.date, h.hours])).get(formatYMD(new Date())) ||
    0;

  const syllabus = syllabusSummary.rows[0];
  const pyq = pyqSummary.rows[0];
  const totalTopics = syllabus.total_topics || 0;
  const completedTopics = syllabus.completed_topics || 0;
  const attempted = pyq.attempted || 0;
  const correct = pyq.correct || 0;

  return {
    summary: {
      totalHours,
      totalSessions,
      streak,
      activeDays: distinctDates.rows.length,
      todayHours,
      syllabus: {
        totalTopics,
        completedTopics,
        completionPercentage:
          totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
        needMoreStudy: syllabus.need_more_study || 0,
        averageConfidence: Number((syllabus.average_confidence || 0).toFixed(1)),
        topicHours: syllabus.topic_hours || 0,
      },
      pyq: {
        solved: pyq.solved || 0,
        attempted,
        correct,
        accuracyPercentage:
          attempted === 0 ? 0 : Number(((correct / attempted) * 100).toFixed(1)),
      },
    },
    bySubject,
    weeklySeries: lastNDaysSeries(heatmap, 7),
    monthlySeries: lastNDaysSeries(heatmap, 30),
    heatmap,
    revisionHeatmap: revisionHeatmap.rows.map((r) => ({
      date: r.date,
      count: r.count,
      hours: r.hours,
    })),
    weakSubjects: bySubject
      .filter((s) => s.weak_count > 0)
      .sort((a, b) => b.weak_count - a.weak_count),
  };
}

module.exports = { getAnalytics };
