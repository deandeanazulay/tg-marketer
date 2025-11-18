/*
  # Add Multi-Account Worker System

  ## Overview
  Enhances TG Marketer with distributed worker support for multi-account message sending
  using local Telethon sessions on Windows workers.

  ## Changes to Existing Tables

  ### `tg_accounts` enhancements
  Add fields needed for worker system:
  - `session_key` - Maps to local folder name (e.g., "989906046260")
  - `is_premium` - Telegram Premium status for priority handling
  - `hourly_limit` - Max messages per hour
  - `daily_limit` - Max messages per day  
  - `status` - Current account status
  - `last_active_at` - Last successful message
  - `updated_at` - Last update timestamp

  ### `jobs` enhancements
  Add worker-related fields:
  - `session_key` - Redundant session_key for quick lookups
  - `worker_id` - Which worker instance is processing
  - `scheduled_for` - When to execute the job

  ## New Tables

  ### `worker_heartbeats`
  Tracks active worker instances and their health status.

  ### `worker_jobs`
  Generic job queue for worker tasks beyond message sending.

  ## Security
  - All tables have RLS enabled
  - Authenticated users can access all worker system tables
  - Helper functions for automatic cleanup and counter resets
*/

-- =====================================================
-- 1. ENHANCE TG_ACCOUNTS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add session_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'session_key'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN session_key text UNIQUE;
  END IF;

  -- Add is_premium column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;

  -- Add hourly_limit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'hourly_limit'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN hourly_limit integer NOT NULL DEFAULT 50;
  END IF;

  -- Add daily_limit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN daily_limit integer NOT NULL DEFAULT 200;
  END IF;

  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'status'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN status text NOT NULL DEFAULT 'idle';
  END IF;

  -- Add last_active_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN last_active_at timestamptz;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- Add last_error column (rename from existing if needed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN last_error text;
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tg_accounts' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE tg_accounts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add indexes for efficient worker queries
CREATE INDEX IF NOT EXISTS idx_tg_accounts_session_key ON tg_accounts (session_key);
CREATE INDEX IF NOT EXISTS idx_tg_accounts_status ON tg_accounts (is_active, status);

-- =====================================================
-- 2. ENHANCE JOBS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add session_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'session_key'
  ) THEN
    ALTER TABLE jobs ADD COLUMN session_key text;
  END IF;

  -- Add worker_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'worker_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN worker_id text;
  END IF;

  -- Add scheduled_for column (rename run_after if it exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'scheduled_for'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'jobs' AND column_name = 'run_after'
    ) THEN
      ALTER TABLE jobs RENAME COLUMN run_after TO scheduled_for;
    ELSE
      ALTER TABLE jobs ADD COLUMN scheduled_for timestamptz DEFAULT now();
    END IF;
  END IF;

  -- Rename last_error to error_message
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'last_error'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN last_error TO error_message;
  END IF;

  -- Rename attempts to attempt_count
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'attempts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN attempts TO attempt_count;
  END IF;

  -- Rename picked_by to worker_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'picked_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'worker_id'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN picked_by TO worker_id;
  END IF;

  -- Rename picked_at to claimed_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'picked_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN picked_at TO claimed_at;
  END IF;
END $$;

-- Update existing index to use new column name
DROP INDEX IF EXISTS idx_jobs_sched;
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs (worker_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_account ON jobs (account_id, status);

-- =====================================================
-- 3. CREATE WORKER_HEARTBEATS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id text PRIMARY KEY,
  hostname text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'online',
  active_accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status 
  ON worker_heartbeats (status, last_heartbeat_at);

ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view worker heartbeats"
  ON worker_heartbeats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage worker heartbeats"
  ON worker_heartbeats FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 4. CREATE WORKER_JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS worker_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  account_id uuid REFERENCES tg_accounts(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 5,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  worker_id text,
  result jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_jobs_queue 
  ON worker_jobs (status, priority, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_worker_jobs_account 
  ON worker_jobs (account_id, status);

CREATE INDEX IF NOT EXISTS idx_worker_jobs_worker 
  ON worker_jobs (worker_id, status);

ALTER TABLE worker_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage worker jobs"
  ON worker_jobs FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to automatically mark stale workers as offline
CREATE OR REPLACE FUNCTION mark_stale_workers_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE worker_heartbeats
  SET status = 'offline'
  WHERE status = 'online'
    AND last_heartbeat_at < now() - interval '5 minutes';
END;
$$;

-- Function to reset hourly counters for accounts
CREATE OR REPLACE FUNCTION reset_hourly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tg_accounts
  SET hourly_sent = 0,
      hourly_reset_at = now() + interval '1 hour'
  WHERE hourly_reset_at IS NOT NULL 
    AND hourly_reset_at < now();
END;
$$;

-- Function to reset daily counters for accounts
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tg_accounts
  SET daily_sent = 0,
      daily_reset_at = now() + interval '1 day'
  WHERE daily_reset_at IS NOT NULL 
    AND daily_reset_at < now();
END;
$$;

-- Function to reassign jobs from offline workers
CREATE OR REPLACE FUNCTION reassign_orphaned_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE jobs
  SET worker_id = NULL,
      claimed_at = NULL,
      status = 'queued'
  WHERE status IN ('assigned', 'running')
    AND worker_id IS NOT NULL
    AND worker_id NOT IN (
      SELECT worker_id FROM worker_heartbeats 
      WHERE status = 'online'
    );
END;
$$;