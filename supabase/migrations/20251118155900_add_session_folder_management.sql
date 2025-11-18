/*
  # Session Folder Management System
  
  1. New Tables
    - `session_folders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `telegram_user_id` (text, unique) - The Telegram username number/user ID
      - `folder_path` (text) - Full path to the session folder
      - `display_name` (text) - Human-readable name for the session
      - `status` (text) - Status: 'active', 'inactive', 'running', 'error'
      - `telegram_exe_present` (boolean) - Whether telegram.exe exists in folder
      - `session_file_present` (boolean) - Whether .session file exists
      - `last_script_run` (timestamptz) - Last time automation script ran
      - `script_status` (text) - Script status: 'idle', 'running', 'stopped', 'error'
      - `script_config` (jsonb) - Script configuration (delays, limits, etc.)
      - `error_message` (text) - Last error message if any
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `session_script_logs`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references session_folders)
      - `log_level` (text) - 'info', 'warning', 'error', 'success'
      - `message` (text) - Log message
      - `details` (jsonb) - Additional details
      - `created_at` (timestamptz)
    
    - `session_script_stats`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references session_folders)
      - `messages_sent` (integer) - Total messages sent
      - `messages_failed` (integer) - Failed message attempts
      - `groups_targeted` (integer) - Number of groups messaged
      - `last_reset` (timestamptz) - Last time stats were reset
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own sessions
  
  3. Important Notes
    - Session folders are named using Telegram user IDs
    - Each folder can contain telegram.exe for separate instances
    - Supports Telethon automation script execution
    - Tracks session health and script status
*/

-- Create session_folders table
CREATE TABLE IF NOT EXISTS session_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_user_id text NOT NULL,
  folder_path text NOT NULL,
  display_name text NOT NULL,
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'running', 'error')),
  telegram_exe_present boolean DEFAULT false,
  session_file_present boolean DEFAULT false,
  last_script_run timestamptz,
  script_status text DEFAULT 'idle' CHECK (script_status IN ('idle', 'running', 'stopped', 'error')),
  script_config jsonb DEFAULT '{"delay_min_sec": 2, "delay_max_sec": 5, "group_delay_sec": 12, "max_messages_per_cycle": 50}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, telegram_user_id)
);

-- Create session_script_logs table
CREATE TABLE IF NOT EXISTS session_script_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES session_folders(id) ON DELETE CASCADE NOT NULL,
  log_level text DEFAULT 'info' CHECK (log_level IN ('info', 'warning', 'error', 'success')),
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create session_script_stats table
CREATE TABLE IF NOT EXISTS session_script_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES session_folders(id) ON DELETE CASCADE NOT NULL,
  messages_sent integer DEFAULT 0,
  messages_failed integer DEFAULT 0,
  groups_targeted integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_folders_user_id ON session_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_session_folders_status ON session_folders(status);
CREATE INDEX IF NOT EXISTS idx_session_folders_script_status ON session_folders(script_status);
CREATE INDEX IF NOT EXISTS idx_session_script_logs_session_id ON session_script_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_script_logs_created_at ON session_script_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_script_stats_session_id ON session_script_stats(session_id);

-- Enable Row Level Security
ALTER TABLE session_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_script_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_script_stats ENABLE ROW LEVEL SECURITY;

-- Session Folders Policies
CREATE POLICY "Users can view own session folders"
  ON session_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own session folders"
  ON session_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session folders"
  ON session_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own session folders"
  ON session_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Session Script Logs Policies
CREATE POLICY "Users can view logs for own sessions"
  ON session_script_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_logs.session_id
      AND session_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create logs for own sessions"
  ON session_script_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_logs.session_id
      AND session_folders.user_id = auth.uid()
    )
  );

-- Session Script Stats Policies
CREATE POLICY "Users can view stats for own sessions"
  ON session_script_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_stats.session_id
      AND session_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stats for own sessions"
  ON session_script_stats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_stats.session_id
      AND session_folders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_stats.session_id
      AND session_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stats for own sessions"
  ON session_script_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_folders
      WHERE session_folders.id = session_script_stats.session_id
      AND session_folders.user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_session_folders_updated_at ON session_folders;
CREATE TRIGGER update_session_folders_updated_at
  BEFORE UPDATE ON session_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_script_stats_updated_at ON session_script_stats;
CREATE TRIGGER update_session_script_stats_updated_at
  BEFORE UPDATE ON session_script_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();