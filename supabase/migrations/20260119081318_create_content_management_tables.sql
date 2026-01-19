/*
  # Content Management Tables

  ## Overview
  This migration creates tables for managing various content sections:
  - Rules (game rules)
  - About information (project description)
  - Certificates
  - Reviews (customer testimonials)
  - Promotions (special offers)

  ## New Tables

  ### 1. `rules`
  Game rules content
  - `id` (uuid, primary key)
  - `title` (text) - Section title
  - `content` (text) - Rule content/description
  - `sort_order` (integer) - Display order
  - `is_visible` (boolean) - Visibility flag
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `about_info`
  About project information (single record)
  - `id` (uuid, primary key)
  - `title` (text) - Page title
  - `content` (text) - Main content
  - `mission` (text) - Mission statement
  - `vision` (text) - Vision statement
  - `updated_at` (timestamptz)

  ### 3. `certificates`
  Certificates and awards
  - `id` (uuid, primary key)
  - `title` (text) - Certificate name
  - `description` (text) - Description
  - `image_url` (text) - Certificate image
  - `issued_date` (date) - Issue date
  - `sort_order` (integer)
  - `is_visible` (boolean)
  - `created_at`, `updated_at` (timestamptz)

  ### 4. `reviews`
  Customer reviews
  - `id` (uuid, primary key)
  - `customer_name` (text) - Reviewer name
  - `quest_title` (text) - Quest name
  - `rating` (integer) - Rating 1-5
  - `review_text` (text) - Review content
  - `review_date` (date) - Review date
  - `is_visible` (boolean)
  - `is_featured` (boolean) - Featured review flag
  - `created_at`, `updated_at` (timestamptz)

  ### 5. `promotions`
  Special offers and promotions
  - `id` (uuid, primary key)
  - `title` (text) - Promotion title
  - `description` (text) - Description
  - `discount_text` (text) - Discount info (e.g., "20% off")
  - `image_url` (text) - Promo image
  - `valid_from` (date) - Start date
  - `valid_until` (date) - End date
  - `is_active` (boolean)
  - `sort_order` (integer)
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public read access for visible content
  - Admin-only write access
*/

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- About info table (typically single record)
CREATE TABLE IF NOT EXISTS about_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'О нас',
  content text NOT NULL DEFAULT '',
  mission text DEFAULT '',
  vision text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text,
  issued_date date DEFAULT CURRENT_DATE,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  quest_title text DEFAULT '',
  rating integer CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
  review_text text NOT NULL,
  review_date date DEFAULT CURRENT_DATE,
  is_visible boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  discount_text text DEFAULT '',
  image_url text,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default about info if not exists
INSERT INTO about_info (title, content, mission, vision)
VALUES (
  'О нас',
  'Добро пожаловать в мир квестов!',
  'Создавать незабываемые впечатления',
  'Быть лучшими в индустрии квестов'
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Rules policies
CREATE POLICY "Anyone can view visible rules"
  ON rules FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Admins can manage rules"
  ON rules FOR ALL
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

-- About info policies
CREATE POLICY "Anyone can view about info"
  ON about_info FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage about info"
  ON about_info FOR ALL
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

-- Certificates policies
CREATE POLICY "Anyone can view visible certificates"
  ON certificates FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL
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

-- Reviews policies
CREATE POLICY "Anyone can view visible reviews"
  ON reviews FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
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

-- Promotions policies
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage promotions"
  ON promotions FOR ALL
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