const pool = require("../db");

async function getInterviewPrep(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM "InterviewPrep" WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    next(e);
  }
}

async function upsertInterviewPrep(req, res, next) {
  try {
    const { company_name, target_role, dsa_solved, dsa_target, mock_score, notes, interview_date } = req.body;
    
    // Simple insert or update if exists logic based on company role (assuming users can have multiple rows)
    const result = await pool.query(
      `INSERT INTO "InterviewPrep" (user_id, company_name, target_role, dsa_solved, dsa_target, mock_score, notes, interview_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [req.user.id, company_name, target_role, dsa_solved, dsa_target, mock_score, notes, interview_date]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    next(e);
  }
}

async function getPlacementTracker(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM "PlacementTracker" WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (e) {
    next(e);
  }
}

async function updatePlacementTracker(req, res, next) {
  try {
    const { resume_score, projects_count, skills, applications } = req.body;
    const skillsJson = JSON.stringify(skills || []);
    const applicationsJson = JSON.stringify(applications || []);
    
    const result = await pool.query(
      `INSERT INTO "PlacementTracker" (user_id, resume_score, projects_count, skills, applications, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         resume_score = EXCLUDED.resume_score,
         projects_count = EXCLUDED.projects_count,
         skills = EXCLUDED.skills,
         applications = EXCLUDED.applications,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, resume_score, projects_count, skillsJson, applicationsJson]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getInterviewPrep,
  upsertInterviewPrep,
  getPlacementTracker,
  updatePlacementTracker
};
