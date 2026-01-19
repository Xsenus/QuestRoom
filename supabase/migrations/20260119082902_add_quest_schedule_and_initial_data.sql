/*
  # Quest Schedule and Initial Data

  ## Overview
  This migration adds quest schedule management and populates initial data for content sections.

  ## New Tables

  ### 1. `quest_schedule`
  Time slots for quest bookings
  - `id` (uuid, primary key)
  - `quest_id` (uuid, foreign key to quests)
  - `date` (date) - Scheduled date
  - `time_slot` (time) - Time of the slot
  - `price` (integer) - Price for this slot
  - `is_booked` (boolean) - Booking status
  - `booking_id` (uuid, nullable) - Reference to booking if booked
  - `created_at`, `updated_at` (timestamptz)

  ## Changes to existing tables
  - Update bookings table to link with quest_schedule

  ## Initial Data
  - Sample rules, certificates, reviews, promotions
  - About info populated

  ## Security
  - RLS enabled on quest_schedule
  - Public read access for available slots
  - Admin-only write access
*/

-- Quest Schedule table
CREATE TABLE IF NOT EXISTS quest_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot time NOT NULL,
  price integer DEFAULT 3000,
  is_booked boolean DEFAULT false,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(quest_id, date, time_slot)
);

-- Add quest_schedule_id to bookings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'quest_schedule_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN quest_schedule_id uuid REFERENCES quest_schedule(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE quest_schedule ENABLE ROW LEVEL SECURITY;

-- Quest Schedule policies
CREATE POLICY "Anyone can view available schedule"
  ON quest_schedule FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage schedule"
  ON quest_schedule FOR ALL
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

-- Insert initial rules data
INSERT INTO rules (title, content, sort_order, is_visible) VALUES
('Правила безопасности', 'Запрещается приносить с собой еду и напитки. В квест-руме установлено видеонаблюдение. Администрация не несет ответственности за оставленные личные вещи.', 0, true),
('Возрастные ограничения', 'Дети до 14 лет допускаются только в присутствии взрослых. Для некоторых квестов действуют особые возрастные ограничения.', 1, true),
('Опоздание', 'При опоздании более чем на 15 минут бронь может быть аннулирована без возврата средств.', 2, true)
ON CONFLICT DO NOTHING;

-- Update about info
UPDATE about_info SET
  content = 'Добро пожаловать в мир захватывающих приключений! Наши квест-комнаты в Красноярске предлагают уникальные сюжеты и незабываемые впечатления. Мы создаем атмосферу, в которой каждый участник становится героем своей истории.',
  mission = 'Создавать незабываемые впечатления и дарить эмоции, объединяя людей через увлекательные приключения.',
  vision = 'Стать лучшей сетью квест-комнат в России, где каждый квест - это произведение искусства.'
WHERE id = (SELECT id FROM about_info LIMIT 1);

-- Insert sample certificates
INSERT INTO certificates (title, description, image_url, issued_date, sort_order, is_visible) VALUES
('Сертификат качества ISO 9001', 'Подтверждение соответствия международным стандартам качества обслуживания', '/images/certificates/iso.jpg', '2024-01-15', 0, true),
('Лучший квест-рум 2024', 'Награда от городской ассоциации развлечений', '/images/certificates/award2024.jpg', '2024-06-20', 1, true)
ON CONFLICT DO NOTHING;

-- Insert sample reviews
INSERT INTO reviews (customer_name, quest_title, rating, review_text, review_date, is_visible, is_featured) VALUES
('Александр Иванов', 'ШЕРЛОК', 5, 'Отличный квест! Очень интересные загадки и атмосфера. Рекомендую всем любителям детективов!', '2024-01-10', true, true),
('Мария Петрова', 'МАНЬЯК', 5, 'Очень страшно и захватывающе! Адреналин зашкаливает. Отличная работа актеров!', '2024-01-12', true, true),
('Дмитрий Сидоров', 'ШЕРЛОК', 4, 'Интересный квест, но некоторые загадки были слишком сложными. В целом довольны!', '2024-01-15', true, false)
ON CONFLICT DO NOTHING;

-- Insert sample promotions
INSERT INTO promotions (title, description, discount_text, image_url, valid_from, valid_until, is_active, sort_order) VALUES
('Скидка 20% в будни', 'Приходите в будние дни с 10:00 до 17:00 и получите скидку 20% на любой квест!', '-20%', '/images/promotions/weekday.jpg', '2024-01-01', '2024-12-31', true, 0),
('День рождения', 'Именинник проходит квест бесплатно при группе от 4 человек!', 'БЕСПЛАТНО', '/images/promotions/birthday.jpg', '2024-01-01', '2024-12-31', true, 1)
ON CONFLICT DO NOTHING;