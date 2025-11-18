/*
  # Add created_at column to campaigns table

  1. Changes
    - Add `created_at` column to `campaigns` table with default value of now()
    - This column is required for ordering campaigns by creation date

  2. Security
    - No RLS changes needed as campaigns table already has RLS enabled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;