/*
  # Add INSERT policies for admin tables

  ## Overview
  Adds missing INSERT policies for tables that use upsert operations.

  ## Changes
  - Add INSERT policy for about_info
  - Add INSERT policy for settings
  - Ensures upsert operations work correctly

  ## Security
  - Only authenticated admin users can insert
*/

-- About Info INSERT policy
DROP POLICY IF EXISTS "Admins can insert about" ON about_info;
CREATE POLICY "Admins can insert about"
  ON about_info FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Settings INSERT policy
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      (auth.jwt()->>'email')::text = 'admin@questroom.ru',
      false
    )
  );

-- Bookings INSERT policy (for when users book)
DROP POLICY IF EXISTS "Anyone can insert bookings" ON bookings;
CREATE POLICY "Anyone can insert bookings"
  ON bookings FOR INSERT
  TO public
  WITH CHECK (true);