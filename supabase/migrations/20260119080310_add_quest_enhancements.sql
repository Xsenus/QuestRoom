/*
  # Quest Enhancements: Images, Durations, and Contact Info

  ## Overview
  This migration enhances the quests system with image support, duration badges, 
  multiple contact methods, and structured participant counts.

  ## Changes

  ### 1. New Tables
  
  #### `duration_badges`
  Stores available quest durations and their associated badge images
  - `id` (uuid, primary key) - Unique identifier
  - `duration` (integer, unique) - Duration in minutes (60, 75, 90)
  - `label` (text) - Display label (e.g., "60 минут")
  - `badge_image_url` (text) - URL to badge image
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. Modified Tables
  
  #### `quests` table enhancements:
  
  **New columns:**
  - `duration` (integer) - Quest duration in minutes, references duration_badges
  - `participants_min` (integer) - Minimum number of participants
  - `participants_max` (integer) - Maximum number of participants
  - `main_image` (text) - URL of the main/primary quest image
  - `images` (jsonb) - Array of additional image URLs
  - `phones` (jsonb) - Array of phone numbers
  - `addresses` (jsonb) - Array of addresses
  
  **Migrated columns:**
  - Old `participants` (text) → split into `participants_min` and `participants_max`
  - Old `phone` (text) → converted to `phones` (jsonb array)
  - Old `address` (text) → converted to `addresses` (jsonb array)

  ## Security
  - Enable RLS on `duration_badges` table
  - Add public read policy for duration_badges
  - Add admin policies for managing duration_badges
  - Update quest policies to include new fields

  ## Default Data
  Three default duration badges are created (60, 75, 90 minutes)
*/

-- Create duration_badges table
CREATE TABLE IF NOT EXISTS duration_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration integer UNIQUE NOT NULL CHECK (duration > 0),
  label text NOT NULL,
  badge_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to quests table
DO $$
BEGIN
  -- Add duration column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'duration'
  ) THEN
    ALTER TABLE quests ADD COLUMN duration integer DEFAULT 60;
  END IF;

  -- Add participant range columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'participants_min'
  ) THEN
    ALTER TABLE quests ADD COLUMN participants_min integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'participants_max'
  ) THEN
    ALTER TABLE quests ADD COLUMN participants_max integer DEFAULT 6;
  END IF;

  -- Add image columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'main_image'
  ) THEN
    ALTER TABLE quests ADD COLUMN main_image text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'images'
  ) THEN
    ALTER TABLE quests ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add phones column (array of phone numbers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'phones'
  ) THEN
    ALTER TABLE quests ADD COLUMN phones jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add addresses column (array of addresses)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'addresses'
  ) THEN
    ALTER TABLE quests ADD COLUMN addresses jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Migrate existing data from old columns to new jsonb arrays
DO $$
BEGIN
  -- Migrate phone to phones array (if phone column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'phone'
  ) THEN
    UPDATE quests 
    SET phones = jsonb_build_array(phone)
    WHERE phone IS NOT NULL AND phone != '';
  END IF;

  -- Migrate address to addresses array (if address column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quests' AND column_name = 'address'
  ) THEN
    UPDATE quests 
    SET addresses = jsonb_build_array(address)
    WHERE address IS NOT NULL AND address != '';
  END IF;
END $$;

-- Insert default duration badges
INSERT INTO duration_badges (duration, label, badge_image_url)
VALUES 
  (60, '60 минут', '/images/badges/60min.svg'),
  (75, '75 минут', '/images/badges/75min.svg'),
  (90, '90 минут', '/images/badges/90min.svg')
ON CONFLICT (duration) DO NOTHING;

-- Add foreign key constraint for duration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quests_duration_fkey'
  ) THEN
    ALTER TABLE quests 
    ADD CONSTRAINT quests_duration_fkey 
    FOREIGN KEY (duration) 
    REFERENCES duration_badges(duration);
  END IF;
END $$;

-- Enable RLS on duration_badges
ALTER TABLE duration_badges ENABLE ROW LEVEL SECURITY;

-- Public can read duration badges
CREATE POLICY "Anyone can view duration badges"
  ON duration_badges FOR SELECT
  TO public
  USING (true);

-- Only authenticated admins can insert duration badges
CREATE POLICY "Admins can insert duration badges"
  ON duration_badges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin'
           OR auth.users.email = 'admin@questroom.ru')
    )
  );

-- Only authenticated admins can update duration badges
CREATE POLICY "Admins can update duration badges"
  ON duration_badges FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin'
           OR auth.users.email = 'admin@questroom.ru')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin'
           OR auth.users.email = 'admin@questroom.ru')
    )
  );

-- Only authenticated admins can delete duration badges
CREATE POLICY "Admins can delete duration badges"
  ON duration_badges FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin'
           OR auth.users.email = 'admin@questroom.ru')
    )
  );