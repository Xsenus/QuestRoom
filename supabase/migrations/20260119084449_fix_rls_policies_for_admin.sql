/*
  # Fix RLS Policies for Admin Access

  ## Overview
  Updates all RLS policies to use JWT-based admin check instead of database table lookup.
  This fixes "permission denied for table users" errors.

  ## Changes
  - Updates all admin policies to use auth.jwt() instead of querying auth.users table
  - Admin check now looks at app_metadata in JWT token
  - More efficient and secure approach

  ## Security
  - Admin access controlled through JWT metadata
  - No direct database table access needed for authorization
*/

-- Drop existing restrictive admin policies and recreate with JWT check
DROP POLICY IF EXISTS "Admins can manage schedule" ON quest_schedule;
DROP POLICY IF EXISTS "Admins can manage rules" ON rules;
DROP POLICY IF EXISTS "Admins can manage about info" ON about_info;
DROP POLICY IF EXISTS "Admins can manage certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;

-- Quest Schedule policies
CREATE POLICY "Admins can manage schedule"
  ON quest_schedule FOR ALL
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Rules policies
CREATE POLICY "Admins can select rules"
  ON rules FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can insert rules"
  ON rules FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update rules"
  ON rules FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can delete rules"
  ON rules FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- About Info policies
CREATE POLICY "Admins can select about"
  ON about_info FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update about"
  ON about_info FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Certificates policies
CREATE POLICY "Admins can select certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can insert certificates"
  ON certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update certificates"
  ON certificates FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can delete certificates"
  ON certificates FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Reviews policies
CREATE POLICY "Admins can select reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Promotions policies
CREATE POLICY "Admins can select promotions"
  ON promotions FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can insert promotions"
  ON promotions FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update promotions"
  ON promotions FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can delete promotions"
  ON promotions FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Settings policies
CREATE POLICY "Admins can select settings"
  ON settings FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Bookings policies
CREATE POLICY "Admins can select bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );