/*
  # Create TG-Marketer core tables

  1. New Tables
    - `tg_accounts` - Telegram user accounts with encrypted sessions
    - `tg_chats` - Known Telegram groups/channels
    - `msg_templates` - Message templates for campaigns
    - `campaigns` - Campaign definitions
    - `jobs` - Job queue for message sending
    - `job_logs` - Execution logs
    - `app_settings` - Application configuration
    - `telegram_apps` - Telegram app credentials (encrypted)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Telegram user accounts (sessions stored encrypted)
CREATE TABLE IF NOT EXISTS tg_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  phone text,
  session_blob_enc bytea NOT NULL,
  is_sleeping boolean NOT NULL DEFAULT false,
  connected boolean NOT NULL DEFAULT false,
  last_cooldown_until timestamptz,
  hourly_sent int NOT NULL DEFAULT 0,
  daily_sent int NOT NULL DEFAULT 0,
  hourly_reset_at timestamptz,
  daily_reset_at timestamptz,
  proxy_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Known Telegram chats (groups/channels)
CREATE TABLE IF NOT EXISTS tg_chats (
  id bigint PRIMARY KEY,
  title text,
  writable boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz
);

-- Message templates
CREATE TABLE IF NOT EXISTS msg_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  text_md text NOT NULL,
  buttons_json jsonb,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid NOT NULL REFERENCES msg_templates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
);

-- Job queue
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES tg_accounts(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL REFERENCES tg_chats(id) ON DELETE RESTRICT,
  run_after timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  picked_at timestamptz,
  picked_by text
);

CREATE INDEX IF NOT EXISTS idx_jobs_sched ON jobs (status, run_after);

-- Job logs
CREATE TABLE IF NOT EXISTS job_logs (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  level text NOT NULL,
  message text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);

-- App settings (non-secrets)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Telegram app credentials (encrypted)
CREATE TABLE IF NOT EXISTS telegram_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  api_id_enc bytea NOT NULL,
  api_hash_enc bytea NOT NULL,
  salt bytea NOT NULL,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE tg_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE msg_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_apps ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated access (adjust as needed)
CREATE POLICY "Allow all operations for authenticated users" ON tg_accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON tg_chats FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON msg_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON job_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON telegram_apps FOR ALL TO authenticated USING (true);