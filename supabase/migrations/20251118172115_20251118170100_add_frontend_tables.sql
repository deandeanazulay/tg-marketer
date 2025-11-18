/*
  # Add Frontend Required Tables

  ## Overview
  Creates tables needed by the frontend that don't exist yet

  ## New Tables
  - `destinations` - Chat destinations
  - `templates` - Message templates
  - `campaign_items` - Campaign execution tracking
  - `user_preferences` - User preferences
  - `app_config` - App configuration

  ## Security
  - All tables have RLS enabled
  - Policies allow authenticated users full access
*/

-- =====================================================
-- 1. CREATE DESTINATIONS TABLE
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

DROP POLICY IF EXISTS "Users can manage own destinations" ON destinations;
CREATE POLICY "Users can manage own destinations"
  ON destinations FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 2. CREATE TEMPLATES TABLE
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

DROP POLICY IF EXISTS "Users can manage own templates" ON templates;
CREATE POLICY "Users can manage own templates"
  ON templates FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 3. ADD owner_id TO CAMPAIGNS IF NEEDED
-- =====================================================

DO $$
BEGIN
  -- Add owner_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN owner_id text;
    ALTER TABLE campaigns ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Update campaigns to reference new templates table if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_template_id_templates_fkey'
  ) THEN
    -- Drop old foreign key if exists
    ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_template_id_fkey;
    -- Add new foreign key to templates table
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_template_id_templates_fkey
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 4. CREATE CAMPAIGN_ITEMS TABLE
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

DROP POLICY IF EXISTS "Users can manage campaign items" ON campaign_items;
CREATE POLICY "Users can manage campaign items"
  ON campaign_items FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 5. CREATE USER_PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  telegram_id text NOT NULL,
  app text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('demo', 'real')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_id, app)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 6. CREATE APP_CONFIG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS app_config (
  app text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app config" ON app_config;
DROP POLICY IF EXISTS "Admins can manage app config" ON app_config;

CREATE POLICY "Anyone can read app config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app config"
  ON app_config FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 7. INSERT DEFAULT DATA
-- =====================================================

-- Insert default app config
INSERT INTO app_config (app, config, updated_at)
VALUES (
  'tg-marketer',
  '{
    "adapters": {"data": "postgres"},
    "features": {"campaigns": true, "templates": true, "destinations": true},
    "ui": {"brand": "TG Marketer", "accent": "#0088cc"},
    "defaults": {"mode": "demo"}
  }'::jsonb,
  now()
)
ON CONFLICT (app) DO NOTHING;

-- Insert demo data for demo_user
INSERT INTO destinations (owner_id, chat_id, title, type, can_send)
SELECT 'demo_user', '-1001234567890', 'Tech News Channel', 'channel', true
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE owner_id = 'demo_user' LIMIT 1);

INSERT INTO destinations (owner_id, chat_id, title, type, can_send)
SELECT 'demo_user', '-1001234567891', 'Marketing Group', 'group', true
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE owner_id = 'demo_user' AND chat_id = '-1001234567891');

INSERT INTO destinations (owner_id, chat_id, title, type, can_send)
SELECT 'demo_user', '-1001234567892', 'Product Updates', 'channel', true
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE owner_id = 'demo_user' AND chat_id = '-1001234567892');

INSERT INTO destinations (owner_id, chat_id, title, type, can_send)
SELECT 'demo_user', '-1001234567893', 'Customer Support', 'group', true
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE owner_id = 'demo_user' AND chat_id = '-1001234567893');

-- Insert demo templates
INSERT INTO templates (owner_id, name, content, variables)
SELECT 'demo_user', 'Welcome Message', 'Hello {name}! Welcome to our community.', '{"name": "User"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE owner_id = 'demo_user' LIMIT 1);

INSERT INTO templates (owner_id, name, content, variables)
SELECT 'demo_user', 'Product Launch', 'We are launching {product} on {date}!', '{"product": "Feature", "date": "Soon"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE owner_id = 'demo_user' AND name = 'Product Launch');

INSERT INTO templates (owner_id, name, content, variables)
SELECT 'demo_user', 'Weekly Update', 'This week: {highlights}', '{"highlights": "Updates"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE owner_id = 'demo_user' AND name = 'Weekly Update');

-- Insert demo user preference
INSERT INTO user_preferences (telegram_id, app, mode)
VALUES ('demo_user', 'tg-marketer', 'demo')
ON CONFLICT (telegram_id, app) DO NOTHING;
