-- Aether Academic Study Scheduler - Database Tables Schema
-- Copy and paste this script directly into your Supabase SQL Editor (SQL Editor -> New Query -> Run)

-- NOTE: If you are upgrading your existing database and already ran the SQL script previously,
-- just copy and run the following migration query alone to update the schema:
--
-- ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    joined_date TEXT NOT NULL,
    stats JSONB DEFAULT '{"studyTime": 0, "completedTasks": 0}'::jsonb
);

-- 2. Create Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE
);

-- Insert Default Subjects
INSERT INTO subjects (id, name, color) VALUES
('math', 'Mathematics', '#3b82f6'),
('physics', 'Physics', '#ec4899'),
('chemistry', 'Chemistry', '#10b981'),
('general', 'General Study', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL
);

-- 4. Create Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TEXT NOT NULL
);

-- 5. Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    date TEXT NOT NULL
);

-- Enable Row Level Security (RLS) - Optional: you can turn this off or set appropriate policies
-- For simplicity, since the client app relies on anon access to sync all data, raw access is used.
-- If RLS is enabled, you can add permissive policies:
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
ALTER TABLE schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE announcements FORCE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON subjects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon" ON announcements FOR ALL TO anon USING (true) WITH CHECK (true);
