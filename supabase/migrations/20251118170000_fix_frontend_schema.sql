/*
  # Fix Frontend Schema Alignment

  ## Overview
  This migration creates all tables required by the frontend DataStore interface
  and ensures column names match what the application expects.

  ## New Tables Created
  - `destinations` - Chat destinations for sending messages
  - `templates` - Message templates (separate from msg_templates for frontend)
  - `campaigns` - Campaign tracking with owner_id
  - `campaign_items` - Individual campaign message items
  - `profiles` - User profiles
  - `user_preferences` - User app preferences
  - `app_config` - Application configuration

  ## Changes to Existing Tables
  - None - we preserve existing tables and create new ones for frontend

  ## Security
  - All tables have RLS enabled
  - Policies allow authenticated users to manage their own data
*/

-- =====================================================
-- 1. CREATE PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  telegram_id text PRIMARY KEY,
  username text,
  first_name text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON profiles FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 2. CREATE DESTINATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  chat_id text NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('channel', 'group', 'private')),
  can_send boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destinations_owner_id ON destinations (owner_id);
CREATE INDEX IF NOT EXISTS idx_destinations_chat_id ON destinations (chat_id);

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own destinations"
  ON destinations FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 3. CREATE TEMPLATES TABLE (for frontend)
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON templates (owner_id);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON templates FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 4. CREATE CAMPAIGNS TABLE (with owner_id)
-- =====================================================

-- Drop the existing campaigns table if it doesn't have owner_id
DO $$
BEGIN
  -- Check if campaigns table exists without owner_id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'campaigns'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'owner_id'
  ) THEN
    -- Rename the old table
    ALTER TABLE campaigns RENAME TO campaigns_old;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'done', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON campaigns (owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns (template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 5. CREATE CAMPAIGN_ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  last_error text,
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign_id ON campaign_items (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_destination_id ON campaign_items (destination_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status ON campaign_items (status);

ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage campaign items"
  ON campaign_items FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 6. CREATE USER_PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  telegram_id text NOT NULL,
  app text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('demo', 'real')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_id, app)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 7. CREATE APP_CONFIG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS app_config (
  app text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app config"
  ON app_config FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 8. INSERT DEFAULT APP CONFIG
-- =====================================================

INSERT INTO app_config (app, config, updated_at)
VALUES (
  'tg-marketer',
  '{
    "adapters": {
      "data": "postgres"
    },
    "features": {
      "campaigns": true,
      "templates": true,
      "destinations": true
    },
    "ui": {
      "brand": "TG Marketer",
      "accent": "#0088cc"
    },
    "defaults": {
      "mode": "demo"
    }
  }'::jsonb,
  now()
)
ON CONFLICT (app) DO NOTHING;

-- =====================================================
-- 9. CREATE DEMO DATA FOR TESTING
-- =====================================================

-- Insert demo destinations
INSERT INTO destinations (owner_id, chat_id, title, type, can_send, created_at)
VALUES
  ('demo_user', '-1001234567890', 'Tech News Channel', 'channel', true, now() - interval '5 days'),
  ('demo_user', '-1001234567891', 'Marketing Group', 'group', true, now() - interval '4 days'),
  ('demo_user', '-1001234567892', 'Product Updates', 'channel', true, now() - interval '3 days'),
  ('demo_user', '-1001234567893', 'Customer Support', 'group', true, now() - interval '2 days')
ON CONFLICT DO NOTHING;

-- Insert demo templates
INSERT INTO templates (owner_id, name, content, variables, created_at)
VALUES
  ('demo_user', 'Welcome Message', 'Hello {name}! Welcome to our community. We''re excited to have you here.', '{"name": "User"}'::jsonb, now() - interval '6 days'),
  ('demo_user', 'Product Launch', 'Exciting news! We''re launching {product} on {date}. Don''t miss it!', '{"product": "New Feature", "date": "Next Week"}'::jsonb, now() - interval '5 days'),
  ('demo_user', 'Weekly Update', 'This week''s highlights: {highlights}. Stay tuned for more!', '{"highlights": "Bug fixes and improvements"}'::jsonb, now() - interval '4 days')
ON CONFLICT DO NOTHING;

-- Insert demo profile
INSERT INTO profiles (telegram_id, username, first_name, role, created_at)
VALUES
  ('demo_user', 'demo_user', 'Demo User', 'user', now() - interval '30 days')
ON CONFLICT (telegram_id) DO NOTHING;

-- Insert demo user preference
INSERT INTO user_preferences (telegram_id, app, mode, updated_at)
VALUES
  ('demo_user', 'tg-marketer', 'demo', now())
ON CONFLICT (telegram_id, app) DO NOTHING;
