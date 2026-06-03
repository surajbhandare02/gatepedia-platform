const pool = require("../db");
const { HttpError } = require("../middleware/errorHandler");

async function ensureAdmin(user) {
  if (user?.role === "admin") return;
  const result = await pool.query("SELECT role FROM users WHERE id = $1", [user.id]);
  if (result.rows[0]?.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }
}

async function overview(user) {
  await ensureAdmin(user);
  const [users, sessions, topics, uploads] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM progress"),
    pool.query("SELECT COUNT(*)::int AS count FROM topics"),
    pool.query("SELECT COUNT(*)::int AS count FROM uploads"),
  ]);
  return {
    users: users.rows[0].count,
    sessions: sessions.rows[0].count,
    topics: topics.rows[0].count,
    uploads: uploads.rows[0].count,
  };
}

module.exports = { overview, ensureAdmin };
