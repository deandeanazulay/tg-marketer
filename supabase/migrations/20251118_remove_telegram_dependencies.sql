/*
  # Remove Telegram Mini App Dependencies

  ## Overview
  Transforms TG Marketer from a Telegram Mini App to a standalone backend system
  with standard authentication.

  ## Changes

  ### New Tables
  - `users` - Standard user accounts with email/password authentication

  ### Updated Tables
  - `profiles` - Made telegram_id optional, added user_id reference
  - `templates` - Changed owner_id to reference users table
  - `destinations` - Changed owner_id to reference users table
  - `campaigns` - Changed owner_id to reference users table
  - `tg_accounts` - Already has proper structure for worker system

  ## Security
  - All tables have RLS enabled
  - Policies updated to use user_id instead of telegram_id
*/

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- =====================================================
-- 2. UPDATE PROFILES TABLE
-- =====================================================

DO $$
BEGIN
  -- Add user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Make telegram_id nullable
  ALTER TABLE profiles ALTER COLUMN telegram_id DROP NOT NULL;

  -- Make first_name nullable (since we may not have it without Telegram)
  ALTER TABLE profiles ALTER COLUMN first_name DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 3. UPDATE TEMPLATES TABLE
-- =====================================================

DO $$
BEGIN
  -- Rename owner_id to user_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'owner_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE templates RENAME COLUMN owner_id TO user_id;
  END IF;
END $$;

-- Update RLS policies for templates
DROP POLICY IF EXISTS "Users can manage own templates" ON templates;

CREATE POLICY "Users can manage own templates"
  ON templates FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- =====================================================
-- 4. UPDATE DESTINATIONS TABLE
-- =====================================================

DO $$
BEGIN
  -- Rename owner_id to user_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'owner_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE destinations RENAME COLUMN owner_id TO user_id;
  END IF;
END $$;

-- Update RLS policies for destinations
DROP POLICY IF EXISTS "Users can manage own destinations" ON destinations;

CREATE POLICY "Users can manage own destinations"
  ON destinations FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- =====================================================
-- 5. UPDATE CAMPAIGNS TABLE
-- =====================================================

DO $$
BEGIN
  -- Rename owner_id to user_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'owner_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE campaigns RENAME COLUMN owner_id TO user_id;
  END IF;
END $$;

-- Update RLS policies for campaigns
DROP POLICY IF EXISTS "Users can manage own campaigns" ON campaigns;

CREATE POLICY "Users can manage own campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- =====================================================
-- 6. UPDATE USER_PREFS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_prefs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_prefs ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Make telegram_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_prefs' AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE user_prefs ALTER COLUMN telegram_id DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_prefs (user_id);

-- Update RLS policies for user_prefs
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_prefs;

CREATE POLICY "Users can manage own preferences"
  ON user_prefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 7. CREATE DEFAULT ADMIN USER
-- =====================================================

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
  'admin@tgmarketer.local',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Administrator',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;
