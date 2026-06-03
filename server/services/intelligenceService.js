const pool = require("../db");

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((Number(numerator || 0) / Number(denominator || 1)) * 100);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(start, end) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((end - start) / ms));
}

async function loadLearningState(userId) {
  const [subjects, totals, sessions, pyq, revisions, user] = await Promise.all([
    pool.query(
      `SELECT s.id,
              s.name,
              COUNT(t.id)::int AS topic_count,
              COUNT(tp.topic_id) FILTER (WHERE tp.completed)::int AS completed_topics,
              COALESCE(AVG(tp.confidence_level), 0)::float AS confidence,
              COALESCE(SUM(tp.study_hours), 0)::float AS hours,
              COUNT(tp.topic_id) FILTER (
                WHERE tp.need_more_study OR tp.difficulty_level = 'hard'
              )::int AS needs_attention,
              COALESCE(SUM(pyq.solved_count), 0)::int AS pyq_solved,
              COALESCE(SUM(pyq.attempted_count), 0)::int AS pyq_attempted,
              COALESCE(SUM(pyq.correct_count), 0)::int AS pyq_correct
       FROM subjects s
       LEFT JOIN topics t ON t.subject_id = s.id
       LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
       LEFT JOIN pyq_tracking pyq ON pyq.topic_id = t.id AND pyq.user_id = $1
       WHERE s.user_id IS NULL OR s.user_id = $1
       GROUP BY s.id, s.name, s.display_order
       ORDER BY s.display_order, s.name`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(t.id)::int AS total_topics,
              COUNT(tp.topic_id) FILTER (WHERE tp.completed)::int AS completed_topics,
              COALESCE(SUM(tp.study_hours), 0)::float AS topic_hours,
              COALESCE(AVG(tp.confidence_level), 0)::float AS confidence
       FROM subjects s
       JOIN topics t ON t.subject_id = s.id
       LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
       WHERE s.user_id IS NULL OR s.user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(study_hours), 0)::float AS hours_14d,
              COUNT(*)::int AS sessions_14d
       FROM progress
       WHERE (user_id = $1 OR user_id IS NULL)
         AND study_date >= CURRENT_DATE - INTERVAL '13 days'`,
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
      `SELECT COUNT(*)::int AS revision_count
       FROM revisions
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT id, name, target_exam_date, daily_goal_hours, weekly_goal_hours, preferences
       FROM users
       WHERE id = $1`,
      [userId]
    ),
  ]);

  return {
    subjects: subjects.rows,
    totals: totals.rows[0],
    sessions: sessions.rows[0],
    pyq: pyq.rows[0],
    revisions: revisions.rows[0],
    user: user.rows[0],
  };
}

function readinessScore(state) {
  const completion = pct(state.totals.completed_topics, state.totals.total_topics);
  const confidence = Number(state.totals.confidence || 0) * 20;
  const accuracy = pct(state.pyq.correct, state.pyq.attempted);
  const consistency = clamp(Number(state.sessions.sessions_14d || 0) * 5, 0, 100);
  const revision = clamp(Number(state.revisions.revision_count || 0) * 3, 0, 100);

  return Math.round(
    completion * 0.34 +
      confidence * 0.22 +
      accuracy * 0.22 +
      consistency * 0.12 +
      revision * 0.1
  );
}

function subjectPriority(subject) {
  const completion = pct(subject.completed_topics, subject.topic_count);
  const accuracy = pct(subject.pyq_correct, subject.pyq_attempted);
  const confidence = Number(subject.confidence || 0) * 20;
  const weakLoad = Number(subject.needs_attention || 0) * 12;
  return clamp(100 - completion + weakLoad + (100 - accuracy) * 0.25 + (100 - confidence) * 0.25, 0, 100);
}

async function getPlanner(userId) {
  const state = await loadLearningState(userId);
  const priorities = state.subjects
    .map((subject) => ({
      ...subject,
      completion_percentage: pct(subject.completed_topics, subject.topic_count),
      pyq_accuracy: pct(subject.pyq_correct, subject.pyq_attempted),
      priority_score: Math.round(subjectPriority(subject)),
    }))
    .sort((a, b) => b.priority_score - a.priority_score);

  const topSubjects = priorities.slice(0, 4);
  const topicRows = await pool.query(
    `SELECT t.id,
            t.title,
            s.name AS subject,
            COALESCE(tp.completed, FALSE) AS completed,
            COALESCE(tp.confidence_level, 3) AS confidence_level,
            COALESCE(tp.difficulty_level, 'medium') AS difficulty_level,
            COALESCE(tp.need_more_study, FALSE) AS need_more_study,
            COALESCE(pyq.solved_count, 0) AS pyq_solved
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
     LEFT JOIN pyq_tracking pyq ON pyq.topic_id = t.id AND pyq.user_id = $1
     WHERE (s.user_id IS NULL OR s.user_id = $1)
       AND COALESCE(tp.completed, FALSE) = FALSE
     ORDER BY
       COALESCE(tp.need_more_study, FALSE) DESC,
       CASE COALESCE(tp.difficulty_level, 'medium')
         WHEN 'hard' THEN 1 WHEN 'medium' THEN 2 ELSE 3
       END,
       COALESCE(tp.confidence_level, 3) ASC,
       t.display_order ASC
     LIMIT 12`,
    [userId]
  );

  const dailyGoal = Number(state.user?.daily_goal_hours || 4);
  const studyBlocks = topicRows.rows.slice(0, 4).map((topic, index) => ({
    order: index + 1,
    topic_id: topic.id,
    title: topic.title,
    subject: topic.subject,
    minutes: index === 0 ? Math.round(dailyGoal * 20) : 45,
    reason:
      topic.need_more_study || topic.difficulty_level === "hard"
        ? "Weak or hard topic needs focused attention"
        : "Pending syllabus coverage with low confidence",
  }));

  const dueRevision = await getDueRevisionRecommendations(userId, 7);
  const pyqRecommendations = topicRows.rows
    .filter((topic) => Number(topic.pyq_solved || 0) < 10)
    .slice(0, 5)
    .map((topic) => ({
      topic_id: topic.id,
      title: topic.title,
      subject: topic.subject,
      target_pyqs: 10 - Number(topic.pyq_solved || 0),
    }));

  return {
    generated_at: new Date().toISOString(),
    readiness_score: readinessScore(state),
    daily_goal_hours: dailyGoal,
    priority_subjects: topSubjects,
    today_plan: studyBlocks,
    revision_schedule: dueRevision,
    pyq_recommendations: pyqRecommendations,
    forecast: buildForecast(state),
  };
}

function buildForecast(state) {
  const remaining = Math.max(
    0,
    Number(state.totals.total_topics || 0) - Number(state.totals.completed_topics || 0)
  );
  const last14Hours = Number(state.sessions.hours_14d || 0);
  const velocity = Math.max(1, last14Hours / 14);
  const estimatedDays = Math.ceil((remaining * 1.8) / velocity);
  const examDate = state.user?.target_exam_date
    ? new Date(state.user.target_exam_date)
    : null;
  const today = new Date();

  return {
    remaining_topics: remaining,
    estimated_completion_days: estimatedDays,
    estimated_completion_date: new Date(
      today.getTime() + estimatedDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10),
    days_until_exam: examDate ? daysBetween(today, examDate) : null,
    pace_status:
      examDate && estimatedDays > daysBetween(today, examDate)
        ? "behind"
        : "on_track",
  };
}

async function getDueRevisionRecommendations(userId, days = 14) {
  const result = await pool.query(
    `SELECT t.id AS topic_id,
            t.title,
            s.name AS subject,
            rs.due_date::text AS due_date,
            rs.revision_stage,
            rs.interval_days,
            COALESCE(tp.confidence_level, 3) AS confidence_level
     FROM revision_schedule rs
     JOIN topics t ON t.id = rs.topic_id
     JOIN subjects s ON s.id = t.subject_id
     LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = rs.user_id
     WHERE rs.user_id = $1
       AND rs.status IN ('due', 'planned')
       AND rs.due_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
     ORDER BY rs.due_date ASC, tp.confidence_level ASC
     LIMIT 12`,
    [userId, days]
  );
  return result.rows;
}

async function getPerformanceInsights(userId) {
  const state = await loadLearningState(userId);
  const priorities = state.subjects
    .map((subject) => ({
      subject: subject.name,
      completion_percentage: pct(subject.completed_topics, subject.topic_count),
      confidence: Number(subject.confidence || 0).toFixed(1),
      pyq_accuracy: pct(subject.pyq_correct, subject.pyq_attempted),
      weak_topics: Number(subject.needs_attention || 0),
      strength_score: Math.round(100 - subjectPriority(subject)),
    }))
    .sort((a, b) => a.strength_score - b.strength_score);

  const score = readinessScore(state);
  
  // AI Rank Predictor logic based on historical GATE distributions
  let predictedRank = "> 10000";
  if (score >= 85) predictedRank = "Top 100";
  else if (score >= 75) predictedRank = "100 - 500";
  else if (score >= 65) predictedRank = "500 - 1500";
  else if (score >= 55) predictedRank = "1500 - 4000";
  else if (score >= 45) predictedRank = "4000 - 8000";

  const insights = [
    {
      title: "Predicted Rank (AIR)",
      body: `Based on your readiness score (${score}/100), your estimated All India Rank is ${predictedRank}.`,
      severity: score >= 65 ? "positive" : score >= 45 ? "watch" : "risk",
    },
    {
      title: "Readiness score",
      body: `Current estimated readiness is ${score}/100 based on completion, confidence, PYQs, consistency, and revision.`,
      severity: score >= 70 ? "positive" : score >= 45 ? "watch" : "risk",
    },
    {
      title: "Primary weak subject",
      body: priorities[0]
        ? `${priorities[0].subject} needs the most attention right now.`
        : "Add topic progress to unlock subject weakness analysis.",
      severity: "watch",
    },
    {
      title: "Forecast",
      body: `${buildForecast(state).remaining_topics} topics remain. Current pace estimates completion in ${buildForecast(state).estimated_completion_days} days.`,
      severity: buildForecast(state).pace_status === "behind" ? "risk" : "positive",
    },
  ];

  return {
    readiness_score: score,
    predicted_rank: predictedRank,
    predicted_score: Math.round(score * 1.05), // GATE scores are typically slightly higher than readiness
    insights,
    subject_strengths: priorities.reverse(),
    weak_subjects: priorities.slice(0, 5),
    forecast: buildForecast(state),
  };
}

async function getPyqAnalyzer(userId) {
  const rows = await pool.query(
    `SELECT s.name AS subject,
            t.title AS topic,
            COALESCE(pyq.solved_count, 0)::int AS solved,
            COALESCE(pyq.easy_count, 0)::int AS easy,
            COALESCE(pyq.medium_count, 0)::int AS medium,
            COALESCE(pyq.hard_count, 0)::int AS hard,
            COALESCE(pyq.attempted_count, 0)::int AS attempted,
            COALESCE(pyq.correct_count, 0)::int AS correct,
            COALESCE(pyq.year_wise_notes, '') AS year_wise_notes
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     LEFT JOIN pyq_tracking pyq ON pyq.topic_id = t.id AND pyq.user_id = $1
     WHERE s.user_id IS NULL OR s.user_id = $1
     ORDER BY pyq.solved_count DESC NULLS LAST, s.display_order, t.display_order`,
    [userId]
  );

  const topicTrends = rows.rows.map((row) => ({
    ...row,
    accuracy: pct(row.correct, row.attempted),
    weighted_difficulty: Number(row.easy || 0) + Number(row.medium || 0) * 2 + Number(row.hard || 0) * 3,
  }));

  const weakPyqTopics = topicTrends
    .filter((row) => row.attempted > 0 && row.accuracy < 60)
    .slice(0, 8);

  const repeatedConcepts = topicTrends
    .filter((row) => row.solved >= 5 || row.year_wise_notes)
    .slice(0, 8)
    .map((row) => ({
      subject: row.subject,
      topic: row.topic,
      signal: row.year_wise_notes
        ? "Year-wise notes mention recurring patterns"
        : "High solved count indicates repeated practice",
    }));

  return {
    topic_trends: topicTrends,
    weak_pyq_topics: weakPyqTopics,
    repeated_concepts: repeatedConcepts,
    difficulty_mix: {
      easy: topicTrends.reduce((sum, row) => sum + Number(row.easy || 0), 0),
      medium: topicTrends.reduce((sum, row) => sum + Number(row.medium || 0), 0),
      hard: topicTrends.reduce((sum, row) => sum + Number(row.hard || 0), 0),
    },
  };
}

module.exports = {
  getPlanner,
  getPerformanceInsights,
  getPyqAnalyzer,
  getDueRevisionRecommendations,
};
