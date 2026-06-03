const pool = require("../db");

let realtimeEmitter = null;

function setRealtimeEmitter(fn) {
  realtimeEmitter = fn;
}

async function createNotification(userId, payload) {
  const result = await pool.query(
    `INSERT INTO notifications
       (user_id, title, body, notification_type, action_url, scheduled_for)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, body, notification_type, action_url,
               read_at, scheduled_for, created_at`,
    [
      userId,
      payload.title,
      payload.body || "",
      payload.notification_type || "info",
      payload.action_url || null,
      payload.scheduled_for || null,
    ]
  );
  const notification = result.rows[0];
  if (realtimeEmitter) realtimeEmitter(userId, notification);
  return notification;
}

async function listNotifications(userId) {
  const result = await pool.query(
    `SELECT id, title, body, notification_type, action_url,
            read_at, scheduled_for, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 40`,
    [userId]
  );
  return result.rows;
}

async function markNotificationRead(userId, notificationId) {
  const result = await pool.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, body, notification_type, action_url,
               read_at, scheduled_for, created_at`,
    [notificationId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
  setRealtimeEmitter,
};
