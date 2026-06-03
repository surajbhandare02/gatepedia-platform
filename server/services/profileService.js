const pool = require("../db");

async function getProfile(userId) {
  const result = await pool.query(
    `SELECT id, name, email, role, avatar_url, target_exam_date::text AS target_exam_date,
            daily_goal_hours::float AS daily_goal_hours,
            weekly_goal_hours::float AS weekly_goal_hours,
            preferences, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function updateProfile(userId, payload) {
  const result = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         avatar_url = COALESCE($3, avatar_url),
         target_exam_date = COALESCE($4::date, target_exam_date),
         daily_goal_hours = COALESCE($5, daily_goal_hours),
         weekly_goal_hours = COALESCE($6, weekly_goal_hours),
         preferences = COALESCE($7::jsonb, preferences),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, role, avatar_url, target_exam_date::text AS target_exam_date,
               daily_goal_hours::float AS daily_goal_hours,
               weekly_goal_hours::float AS weekly_goal_hours,
               preferences, created_at, updated_at`,
    [
      userId,
      payload.name || null,
      payload.avatar_url || null,
      payload.target_exam_date || null,
      payload.daily_goal_hours == null ? null : Number(payload.daily_goal_hours),
      payload.weekly_goal_hours == null ? null : Number(payload.weekly_goal_hours),
      payload.preferences ? JSON.stringify(payload.preferences) : null,
    ]
  );
  return result.rows[0];
}

module.exports = { getProfile, updateProfile };
