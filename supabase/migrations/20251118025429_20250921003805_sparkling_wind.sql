/*
  # Create profiles table for Telegram users

  1. New Tables
    - `profiles`
      - `telegram_id` (bigint, primary key) - Telegram user ID
      - `username` (text, nullable) - Telegram username
      - `first_name` (text) - User's first name
      - `last_name` (text, nullable) - User's last name
      - `language_code` (text, nullable) - User's language preference
      - `is_premium` (boolean) - Telegram Premium status
      - `role` (text) - User role (user, admin)
      - `created_at` (timestamp) - Account creation time
      - `updated_at` (timestamp) - Last update time

  2. Security
    - Enable RLS on `profiles` table
    - Add policy for users to read/update their own profile
*/

CREATE TABLE IF NOT EXISTS profiles (
  telegram_id bigint PRIMARY KEY,
  username text,
  first_name text NOT NULL,
  last_name text,
  language_code text,
  is_premium boolean DEFAULT false,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id')::bigint)
  WITH CHECK (telegram_id = (auth.jwt() ->> 'telegram_id')::bigint);