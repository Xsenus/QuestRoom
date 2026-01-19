/*
  # Create Admin Panel Schema

  ## 1. New Tables
  
  ### `quests` table
    - `id` (uuid, primary key) - Unique identifier for each quest
    - `title` (text) - Quest name/title
    - `description` (text) - Detailed quest description
    - `address` (text) - Street address
    - `phone` (text) - Contact phone number
    - `participants` (text) - Number of participants (e.g., "от 2 до 4 человек")
    - `age_restriction` (text) - Age restriction details
    - `age_rating` (text) - Age rating badge (e.g., "6+", "12+", "16+", "18+")
    - `price` (integer) - Price in rubles
    - `is_new` (boolean) - Whether quest should show NEW ribbon
    - `is_visible` (boolean) - Whether quest is visible on main page
    - `main_image` (text) - URL to main quest image
    - `images` (jsonb) - Array of additional image URLs
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
    - `sort_order` (integer) - Display order on main page
  
  ### `settings` table
    - `id` (uuid, primary key) - Always single row
    - `vk_url` (text, nullable) - VK social link
    - `youtube_url` (text, nullable) - YouTube social link
    - `instagram_url` (text, nullable) - Instagram social link
    - `telegram_url` (text, nullable) - Telegram social link
    - `address` (text, nullable) - Company address
    - `email` (text, nullable) - Contact email
    - `phone` (text, nullable) - Contact phone
    - `logo_url` (text, nullable) - Logo image URL
    - `updated_at` (timestamptz) - Last update timestamp

  ### `bookings` table
    - `id` (uuid, primary key) - Booking identifier
    - `quest_id` (uuid, foreign key) - Reference to quest
    - `customer_name` (text) - Customer name
    - `customer_phone` (text) - Customer phone
    - `customer_email` (text, nullable) - Customer email
    - `booking_date` (timestamptz) - Requested booking date/time
    - `participants_count` (integer) - Number of participants
    - `status` (text) - Booking status (pending, confirmed, cancelled, completed)
    - `notes` (text, nullable) - Additional notes
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
    - Enable RLS on all tables
    - Create policies for authenticated admin users
    - Public read access for quests and settings (visible items only)
    - Admin-only access for bookings and modifications

  ## 3. Initial Data
    - Insert default settings row
    - Insert example quests from current static data
*/

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  participants text NOT NULL,
  age_restriction text NOT NULL,
  age_rating text NOT NULL DEFAULT '18+',
  price integer NOT NULL DEFAULT 0,
  is_new boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  main_image text,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sort_order integer DEFAULT 0
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vk_url text,
  youtube_url text,
  instagram_url text,
  telegram_url text,
  address text,
  email text,
  phone text,
  logo_url text,
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  booking_date timestamptz NOT NULL,
  participants_count integer NOT NULL DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies for quests table
-- Public can read visible quests
CREATE POLICY "Public can view visible quests"
  ON quests FOR SELECT
  TO anon
  USING (is_visible = true);

-- Authenticated users can view all quests
CREATE POLICY "Authenticated users can view all quests"
  ON quests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert quests
CREATE POLICY "Authenticated users can insert quests"
  ON quests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update quests
CREATE POLICY "Authenticated users can update quests"
  ON quests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete quests
CREATE POLICY "Authenticated users can delete quests"
  ON quests FOR DELETE
  TO authenticated
  USING (true);

-- Policies for settings table
-- Public can read settings
CREATE POLICY "Public can view settings"
  ON settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can update settings
CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can insert settings
CREATE POLICY "Authenticated users can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for bookings table
-- Authenticated users can view all bookings
CREATE POLICY "Authenticated users can view bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert bookings
CREATE POLICY "Authenticated users can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update bookings
CREATE POLICY "Authenticated users can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete bookings
CREATE POLICY "Authenticated users can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);

-- Insert default settings
INSERT INTO settings (id, address, phone, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ул. Диксона, д. 1, стр. 4',
  '8 (391) 294-59-50',
  'info@questroom.ru'
) ON CONFLICT (id) DO NOTHING;

-- Insert example quests
INSERT INTO quests (title, description, address, phone, participants, age_restriction, age_rating, is_new, is_visible, sort_order, price)
VALUES 
(
  'ШЕРЛОК',
  'Лондон Викторианской эпохи. Трущобы, расцвет нищеты и беззакония. Вы, Шерлок Холмс, узнали о готовящейся в Лондоне атаке профессора Мориарти, вычислили его логово и вместе с доктором Ватсоном решили нанести ему визит! Вам необходимо за 75 мин разыскать дневник профессора Мориарти! В нем расписаны все планы преступного гения, а в частности, важная информация о времени и месте атаки, которая поможет вам предотвратить угрозу и спасти Лондон! Спешите!',
  'ул. Диксона, д. 1, стр. 4',
  '8 (391) 294-59-50',
  'от 2 до 4 человек',
  'С 6 лет родителями или с 14 лет самостоятельно',
  '6+',
  true,
  true,
  1,
  2500
) ON CONFLICT DO NOTHING;