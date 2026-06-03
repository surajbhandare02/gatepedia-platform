const pool = require("../db");
const intelligenceService = require("./intelligenceService");

function lower(text) {
  return String(text || "").toLowerCase();
}

async function chat(userId, message) {
  const content = String(message || "").trim();
  await pool.query(
    `INSERT INTO assistant_messages (user_id, role, content)
     VALUES ($1, 'user', $2)`,
    [userId, content]
  );

  const planner = await intelligenceService.getPlanner(userId);
  const text = lower(content);
  let reply;

  if (text.includes("plan") || text.includes("today")) {
    reply = `Today, start with ${planner.today_plan[0]?.title || "your weakest pending topic"} and keep the first block distraction-free. Then solve ${planner.pyq_recommendations[0]?.target_pyqs || 5} PYQs from ${planner.pyq_recommendations[0]?.subject || "a weak subject"}.`;
  } else if (text.includes("weak") || text.includes("priority")) {
    const subject = planner.priority_subjects[0];
    reply = subject
      ? `${subject.name} is the current priority because completion is ${subject.completion_percentage}% and the priority score is ${subject.priority_score}.`
      : "Mark topic progress and confidence to unlock weak-topic analysis.";
  } else if (text.includes("revision")) {
    reply = planner.revision_schedule.length
      ? `You have ${planner.revision_schedule.length} revision items due soon. Start with ${planner.revision_schedule[0].title}.`
      : "No scheduled revision is due. Generate a revision calendar from the Revision page.";
  } else {
    reply = `Your current readiness score is ${planner.readiness_score}/100. Focus on one weak topic, one revision item, and one PYQ block today.`;
  }

  await pool.query(
    `INSERT INTO assistant_messages (user_id, role, content, metadata)
     VALUES ($1, 'assistant', $2, $3)`,
    [userId, reply, JSON.stringify({ readiness_score: planner.readiness_score })]
  );

  return { reply, planner_snapshot: planner };
}

async function history(userId) {
  const result = await pool.query(
    `SELECT role, content, metadata, created_at
     FROM assistant_messages
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
  return result.rows.reverse();
}

module.exports = { chat, history };
