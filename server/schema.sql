-- GATE CSE Preparation Management System schema.
-- Run this file after pulling upgrades. It is idempotent for local development.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(120) DEFAULT 'GATE Student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(180);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_exam_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal_hours NUMERIC(5, 2) NOT NULL DEFAULT 4;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal_hours NUMERIC(5, 2) NOT NULL DEFAULT 24;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'predefined',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'predefined',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, title)
);

CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  subject VARCHAR(120) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  study_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
  study_date DATE NOT NULL,
  confidence_level INTEGER NOT NULL DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5),
  difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  need_more_study BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE progress ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS confidence_level INTEGER NOT NULL DEFAULT 3;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium';
ALTER TABLE progress ADD COLUMN IF NOT EXISTS need_more_study BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS topic_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  study_hours NUMERIC(7, 2) NOT NULL DEFAULT 0,
  revision_count INTEGER NOT NULL DEFAULT 0,
  confidence_level INTEGER NOT NULL DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5),
  need_more_study BOOLEAN NOT NULL DEFAULT FALSE,
  difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS pyq_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  solved_count INTEGER NOT NULL DEFAULT 0,
  easy_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  hard_count INTEGER NOT NULL DEFAULT 0,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  year_wise_notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  note_type VARCHAR(30) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id, note_type)
);

CREATE TABLE IF NOT EXISTS revisions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weak_topics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  is_hard BOOLEAN NOT NULL DEFAULT FALSE,
  is_weak BOOLEAN NOT NULL DEFAULT FALSE,
  needs_revision BOOLEAN NOT NULL DEFAULT FALSE,
  high_priority BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INTEGER NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  parsed_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  session_type VARCHAR(30) NOT NULL DEFAULT 'study',
  planned_minutes INTEGER NOT NULL DEFAULT 0,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  focus_score INTEGER NOT NULL DEFAULT 0 CHECK (focus_score BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  mode VARCHAR(30) NOT NULL DEFAULT 'pomodoro',
  focus_minutes INTEGER NOT NULL DEFAULT 25,
  break_minutes INTEGER NOT NULL DEFAULT 5,
  cycles INTEGER NOT NULL DEFAULT 1,
  completed_cycles INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  goal_type VARCHAR(30) NOT NULL DEFAULT 'weekly',
  target_value NUMERIC(8, 2) NOT NULL DEFAULT 0,
  current_value NUMERIC(8, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL DEFAULT 'hours',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision_schedule (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  revision_stage INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'due',
  interval_days INTEGER NOT NULL DEFAULT 1,
  last_revised_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id, revision_stage)
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  badge_type VARCHAR(40) NOT NULL DEFAULT 'consistency',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  xp_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  notification_type VARCHAR(40) NOT NULL DEFAULT 'info',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  upload_id INTEGER REFERENCES uploads(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(80) NOT NULL,
  file_url TEXT,
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  readiness_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  completion_forecast JSONB NOT NULL DEFAULT '{}'::jsonb,
  weak_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_rooms (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  room_code VARCHAR(40) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_room_members (
  room_id INTEGER NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_room_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  provider_account_id VARCHAR(180) NOT NULL,
  access_token_hash TEXT,
  refresh_token_hash TEXT,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS user_mfa_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_groups (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  visibility VARCHAR(30) NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_group_members (
  group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS discussion_threads (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  title VARCHAR(220) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_comments (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_versions (
  id SERIAL PRIMARY KEY,
  attachment_id INTEGER REFERENCES attachments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  storage_key TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INTEGER,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_study_date ON progress (study_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_subject ON progress (subject);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress (user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics (subject_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user ON topic_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_revisions_user_date ON revisions (user_id, revision_date DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads (user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_revision_schedule_user_due ON revision_schedule (user_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_user_topic ON attachments (user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_group ON discussion_threads (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_topic ON discussion_threads (topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_thread ON discussion_comments (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_file_versions_attachment ON file_versions (attachment_id, version_number DESC);

INSERT INTO achievements (code, title, description, xp_reward, badge_type)
VALUES
  ('FIRST_SESSION', 'First Session', 'Logged the first study session.', 50, 'starter'),
  ('THREE_DAY_STREAK', '3 Day Streak', 'Studied for three consecutive days.', 120, 'consistency'),
  ('TEN_TOPICS_DONE', 'Topic Finisher', 'Completed ten syllabus topics.', 200, 'completion'),
  ('FIFTY_PYQS', 'PYQ Grinder', 'Solved fifty previous year questions.', 250, 'practice'),
  ('REVISION_READY', 'Revision Ready', 'Completed five revision entries.', 150, 'revision')
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    badge_type = EXCLUDED.badge_type;

INSERT INTO subjects (name, code, display_order, source)
VALUES
  ('DBMS', 'DBMS', 1, 'predefined'),
  ('Operating Systems', 'OS', 2, 'predefined'),
  ('Computer Networks', 'CN', 3, 'predefined'),
  ('TOC', 'TOC', 4, 'predefined'),
  ('Compiler Design', 'CD', 5, 'predefined'),
  ('Data Structures', 'DS', 6, 'predefined'),
  ('Algorithms', 'ALGO', 7, 'predefined'),
  ('Digital Logic', 'DL', 8, 'predefined'),
  ('Discrete Mathematics', 'DM', 9, 'predefined'),
  ('C Programming', 'C', 10, 'predefined')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    source = EXCLUDED.source;

INSERT INTO topics (subject_id, title, display_order, source)
SELECT s.id, v.title, v.display_order, 'predefined'
FROM subjects s
JOIN (
  VALUES
    ('DBMS', 'ER model and relational model', 1),
    ('DBMS', 'Relational algebra and tuple calculus', 2),
    ('DBMS', 'SQL queries and constraints', 3),
    ('DBMS', 'Normalization and functional dependencies', 4),
    ('DBMS', 'Transactions and concurrency control', 5),
    ('DBMS', 'Indexing, B trees and hashing', 6),
    ('DBMS', 'File organization and query processing', 7),
    ('OS', 'Processes, threads and inter-process communication', 1),
    ('OS', 'CPU scheduling', 2),
    ('OS', 'Synchronization and semaphores', 3),
    ('OS', 'Deadlocks', 4),
    ('OS', 'Memory management and paging', 5),
    ('OS', 'Virtual memory and page replacement', 6),
    ('OS', 'File systems and disk scheduling', 7),
    ('CN', 'OSI and TCP/IP models', 1),
    ('CN', 'Data link layer and MAC protocols', 2),
    ('CN', 'IP addressing and subnetting', 3),
    ('CN', 'Routing algorithms', 4),
    ('CN', 'TCP, UDP and flow control', 5),
    ('CN', 'Congestion control', 6),
    ('CN', 'Application layer protocols', 7),
    ('TOC', 'Regular languages and finite automata', 1),
    ('TOC', 'Regular expressions and minimization', 2),
    ('TOC', 'Context-free grammars and pushdown automata', 3),
    ('TOC', 'Turing machines and decidability', 4),
    ('TOC', 'Undecidability and complexity basics', 5),
    ('CD', 'Lexical analysis', 1),
    ('CD', 'Parsing and syntax analysis', 2),
    ('CD', 'Syntax-directed translation', 3),
    ('CD', 'Intermediate code generation', 4),
    ('CD', 'Code optimization and runtime environments', 5),
    ('DS', 'Arrays, strings and linked lists', 1),
    ('DS', 'Stacks, queues and recursion', 2),
    ('DS', 'Trees, binary search trees and heaps', 3),
    ('DS', 'Hashing', 4),
    ('DS', 'Graphs and traversals', 5),
    ('ALGO', 'Asymptotic analysis and recurrences', 1),
    ('ALGO', 'Sorting and searching', 2),
    ('ALGO', 'Greedy algorithms', 3),
    ('ALGO', 'Dynamic programming', 4),
    ('ALGO', 'Graph algorithms', 5),
    ('ALGO', 'Divide and conquer', 6),
    ('DL', 'Number systems and codes', 1),
    ('DL', 'Boolean algebra and logic gates', 2),
    ('DL', 'Combinational circuits', 3),
    ('DL', 'Sequential circuits', 4),
    ('DL', 'Minimization using K-map', 5),
    ('DM', 'Propositional and first-order logic', 1),
    ('DM', 'Sets, relations and functions', 2),
    ('DM', 'Combinatorics', 3),
    ('DM', 'Graph theory', 4),
    ('DM', 'Group theory basics', 5),
    ('C', 'C syntax, pointers and arrays', 1),
    ('C', 'Functions, recursion and scope', 2),
    ('C', 'Structures, unions and memory layout', 3),
    ('C', 'Dynamic memory allocation', 4),
    ('C', 'File handling and command line arguments', 5)
) AS v(code, title, display_order)
  ON s.code = v.code
ON CONFLICT (subject_id, title) DO UPDATE
SET display_order = EXCLUDED.display_order,
    source = EXCLUDED.source;

-- Enable Row Level Security (RLS) on all tables to satisfy Supabase security linter
-- and prevent unauthorized access via the PostgREST API.
-- Because the Express backend connects using a superuser/service role,
-- it will bypass these RLS policies and continue to function normally.

ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "topic_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pyq_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "weak_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "focus_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "revision_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "streaks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "flashcards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "analytics_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ai_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "assistant_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_room_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_room_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "email_verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "oauth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_mfa_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "study_group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "discussion_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "discussion_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "file_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "InterviewPrep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PlacementTracker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CommunityPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Leaderboard" ENABLE ROW LEVEL SECURITY;
