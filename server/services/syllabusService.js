const pool = require("../db");
const { HttpError } = require("../middleware/errorHandler");

const NOTE_TYPES = ["personal", "formulas", "revision"];
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampConfidence(value) {
  return Math.min(5, Math.max(1, Math.round(toNumber(value, 3))));
}

function difficulty(value) {
  const clean = String(value || "medium").toLowerCase();
  return DIFFICULTIES.has(clean) ? clean : "medium";
}

async function assertTopicAccess(userId, topicId) {
  const result = await pool.query(
    `SELECT t.id, t.title, s.name AS subject
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = $1
       AND (s.user_id IS NULL OR s.user_id = $2)`,
    [topicId, userId]
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "Topic not found");
  }
  return result.rows[0];
}

function emptyNotes(notes) {
  return {
    personal: notes?.personal || "",
    formulas: notes?.formulas || "",
    revision: notes?.revision || "",
  };
}

function mapTopic(row) {
  return {
    id: row.topic_id,
    subject_id: row.subject_id,
    title: row.topic_title,
    description: row.topic_description,
    source: row.topic_source,
    progress: {
      completed: Boolean(row.completed),
      study_hours: toNumber(row.study_hours),
      revision_count: toNumber(row.revision_count),
      confidence_level: toNumber(row.confidence_level, 3),
      need_more_study: Boolean(row.need_more_study),
      difficulty_level: row.difficulty_level || "medium",
    },
    pyq: {
      solved_count: toNumber(row.solved_count),
      easy_count: toNumber(row.easy_count),
      medium_count: toNumber(row.medium_count),
      hard_count: toNumber(row.hard_count),
      attempted_count: toNumber(row.attempted_count),
      correct_count: toNumber(row.correct_count),
      accuracy_percentage: toNumber(row.accuracy_percentage),
      year_wise_notes: row.year_wise_notes || "",
    },
    notes: emptyNotes(row.notes || {}),
    weak: {
      is_hard: Boolean(row.is_hard),
      is_weak: Boolean(row.is_weak),
      needs_revision: Boolean(row.needs_revision),
      high_priority: Boolean(row.high_priority),
      reason: row.weak_reason || "",
    },
  };
}

function summarizeSubject(subject) {
  const topicCount = subject.topics.length;
  const completedTopics = subject.topics.filter((t) => t.progress.completed).length;
  const totalStudyHours = subject.topics.reduce(
    (sum, t) => sum + t.progress.study_hours,
    0
  );
  const weakCount = subject.topics.filter(
    (t) =>
      t.weak.is_hard ||
      t.weak.is_weak ||
      t.weak.needs_revision ||
      t.weak.high_priority ||
      t.progress.need_more_study ||
      t.progress.difficulty_level === "hard"
  ).length;
  const pyqSolved = subject.topics.reduce((sum, t) => sum + t.pyq.solved_count, 0);
  const averageConfidence =
    topicCount === 0
      ? 0
      : subject.topics.reduce((sum, t) => sum + t.progress.confidence_level, 0) /
        topicCount;

  return {
    ...subject,
    topic_count: topicCount,
    completed_topics: completedTopics,
    completion_percentage:
      topicCount === 0 ? 0 : Math.round((completedTopics / topicCount) * 100),
    total_study_hours: Number(totalStudyHours.toFixed(2)),
    weak_count: weakCount,
    pyq_solved: pyqSolved,
    average_confidence: Number(averageConfidence.toFixed(1)),
  };
}

async function getSubjects(userId, { q = "" } = {}) {
  const search = String(q || "").trim();
  const values = [userId];
  let searchSql = "";

  if (search) {
    values.push(`%${search}%`);
    searchSql = `AND (s.name ILIKE $2 OR t.title ILIKE $2)`;
  }

  const result = await pool.query(
    `SELECT s.id AS subject_id,
            s.name AS subject_name,
            s.code AS subject_code,
            s.source AS subject_source,
            s.display_order AS subject_order,
            t.id AS topic_id,
            t.title AS topic_title,
            t.description AS topic_description,
            t.source AS topic_source,
            t.display_order AS topic_order,
            COALESCE(tp.completed, FALSE) AS completed,
            COALESCE(tp.study_hours, 0)::float AS study_hours,
            COALESCE(tp.revision_count, 0) AS revision_count,
            COALESCE(tp.confidence_level, 3) AS confidence_level,
            COALESCE(tp.need_more_study, FALSE) AS need_more_study,
            COALESCE(tp.difficulty_level, 'medium') AS difficulty_level,
            COALESCE(pyq.solved_count, 0) AS solved_count,
            COALESCE(pyq.easy_count, 0) AS easy_count,
            COALESCE(pyq.medium_count, 0) AS medium_count,
            COALESCE(pyq.hard_count, 0) AS hard_count,
            COALESCE(pyq.attempted_count, 0) AS attempted_count,
            COALESCE(pyq.correct_count, 0) AS correct_count,
            COALESCE(pyq.accuracy_percentage, 0)::float AS accuracy_percentage,
            COALESCE(pyq.year_wise_notes, '') AS year_wise_notes,
            COALESCE(wt.is_hard, FALSE) AS is_hard,
            COALESCE(wt.is_weak, FALSE) AS is_weak,
            COALESCE(wt.needs_revision, FALSE) AS needs_revision,
            COALESCE(wt.high_priority, FALSE) AS high_priority,
            COALESCE(wt.reason, '') AS weak_reason,
            COALESCE((
              SELECT jsonb_object_agg(n.note_type, n.content)
              FROM notes n
              WHERE n.user_id = $1 AND n.topic_id = t.id
            ), '{}'::jsonb) AS notes
     FROM subjects s
     LEFT JOIN topics t ON t.subject_id = s.id
     LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.user_id = $1
     LEFT JOIN pyq_tracking pyq ON pyq.topic_id = t.id AND pyq.user_id = $1
     LEFT JOIN weak_topics wt ON wt.topic_id = t.id AND wt.user_id = $1
     WHERE (s.user_id IS NULL OR s.user_id = $1)
       ${searchSql}
     ORDER BY s.display_order ASC, s.name ASC, t.display_order ASC, t.title ASC`,
    values
  );

  const bySubject = new Map();
  result.rows.forEach((row) => {
    if (!bySubject.has(row.subject_id)) {
      bySubject.set(row.subject_id, {
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code,
        source: row.subject_source,
        display_order: row.subject_order,
        topics: [],
      });
    }
    if (row.topic_id) {
      bySubject.get(row.subject_id).topics.push(mapTopic(row));
    }
  });

  return Array.from(bySubject.values()).map(summarizeSubject);
}

async function updateTopicProgress(userId, topicId, payload) {
  await assertTopicAccess(userId, topicId);
  const completed = Boolean(payload.completed);
  const studyHours = Math.max(0, toNumber(payload.study_hours));
  const revisionCount = Math.max(0, Math.round(toNumber(payload.revision_count)));
  const confidence = clampConfidence(payload.confidence_level);
  const needMoreStudy = Boolean(payload.need_more_study);
  const difficultyLevel = difficulty(payload.difficulty_level);

  const result = await pool.query(
    `INSERT INTO topic_progress
       (user_id, topic_id, completed, study_hours, revision_count,
        confidence_level, need_more_study, difficulty_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, topic_id) DO UPDATE
     SET completed = EXCLUDED.completed,
         study_hours = EXCLUDED.study_hours,
         revision_count = EXCLUDED.revision_count,
         confidence_level = EXCLUDED.confidence_level,
         need_more_study = EXCLUDED.need_more_study,
         difficulty_level = EXCLUDED.difficulty_level,
         updated_at = NOW()
     RETURNING completed, study_hours::float AS study_hours, revision_count,
               confidence_level, need_more_study, difficulty_level`,
    [
      userId,
      topicId,
      completed,
      studyHours,
      revisionCount,
      confidence,
      needMoreStudy,
      difficultyLevel,
    ]
  );
  return result.rows[0];
}

async function updatePyq(userId, topicId, payload) {
  await assertTopicAccess(userId, topicId);
  const solved = Math.max(0, Math.round(toNumber(payload.solved_count)));
  const easy = Math.max(0, Math.round(toNumber(payload.easy_count)));
  const medium = Math.max(0, Math.round(toNumber(payload.medium_count)));
  const hard = Math.max(0, Math.round(toNumber(payload.hard_count)));
  const attempted = Math.max(0, Math.round(toNumber(payload.attempted_count || solved)));
  const correct = Math.max(0, Math.round(toNumber(payload.correct_count)));
  const accuracy = attempted > 0 ? Math.min(100, (correct / attempted) * 100) : 0;

  const result = await pool.query(
    `INSERT INTO pyq_tracking
       (user_id, topic_id, solved_count, easy_count, medium_count, hard_count,
        attempted_count, correct_count, accuracy_percentage, year_wise_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, topic_id) DO UPDATE
     SET solved_count = EXCLUDED.solved_count,
         easy_count = EXCLUDED.easy_count,
         medium_count = EXCLUDED.medium_count,
         hard_count = EXCLUDED.hard_count,
         attempted_count = EXCLUDED.attempted_count,
         correct_count = EXCLUDED.correct_count,
         accuracy_percentage = EXCLUDED.accuracy_percentage,
         year_wise_notes = EXCLUDED.year_wise_notes,
         updated_at = NOW()
     RETURNING solved_count, easy_count, medium_count, hard_count,
               attempted_count, correct_count,
               accuracy_percentage::float AS accuracy_percentage,
               year_wise_notes`,
    [
      userId,
      topicId,
      solved,
      easy,
      medium,
      hard,
      attempted,
      correct,
      Number(accuracy.toFixed(2)),
      String(payload.year_wise_notes || ""),
    ]
  );
  return result.rows[0];
}

async function updateNotes(userId, topicId, payload) {
  await assertTopicAccess(userId, topicId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const type of NOTE_TYPES) {
      await client.query(
        `INSERT INTO notes (user_id, topic_id, note_type, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, topic_id, note_type) DO UPDATE
         SET content = EXCLUDED.content,
             updated_at = NOW()`,
        [userId, topicId, type, String(payload[type] || "")]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return emptyNotes(payload);
}

async function updateWeakTopic(userId, topicId, payload) {
  await assertTopicAccess(userId, topicId);
  const result = await pool.query(
    `INSERT INTO weak_topics
       (user_id, topic_id, is_hard, is_weak, needs_revision, high_priority, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, topic_id) DO UPDATE
     SET is_hard = EXCLUDED.is_hard,
         is_weak = EXCLUDED.is_weak,
         needs_revision = EXCLUDED.needs_revision,
         high_priority = EXCLUDED.high_priority,
         reason = EXCLUDED.reason,
         updated_at = NOW()
     RETURNING is_hard, is_weak, needs_revision, high_priority, reason`,
    [
      userId,
      topicId,
      Boolean(payload.is_hard),
      Boolean(payload.is_weak),
      Boolean(payload.needs_revision),
      Boolean(payload.high_priority),
      String(payload.reason || ""),
    ]
  );
  return result.rows[0];
}

async function createRevision(userId, topicId, payload) {
  await assertTopicAccess(userId, topicId);
  const revisionDate = String(payload.revision_date || new Date().toISOString()).slice(0, 10);
  const hours = Math.max(0, toNumber(payload.hours));
  const result = await pool.query(
    `INSERT INTO revisions (user_id, topic_id, revision_date, hours, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, topic_id, revision_date::text AS revision_date, hours::float AS hours,
               notes, created_at`,
    [userId, topicId, revisionDate, hours, String(payload.notes || "")]
  );

  await pool.query(
    `INSERT INTO topic_progress (user_id, topic_id, revision_count, study_hours)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (user_id, topic_id) DO UPDATE
     SET revision_count = topic_progress.revision_count + 1,
         study_hours = topic_progress.study_hours + EXCLUDED.study_hours,
         updated_at = NOW()`,
    [userId, topicId, hours]
  );

  return result.rows[0];
}

module.exports = {
  getSubjects,
  updateTopicProgress,
  updatePyq,
  updateNotes,
  updateWeakTopic,
  createRevision,
};
