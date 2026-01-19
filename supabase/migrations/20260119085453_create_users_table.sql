/*
  # Create Users Table

  ## Overview
  Creates users table for API authentication system.
  Separate from Supabase auth.users table.

  ## New Tables
  - `users` - Application users with credentials
    - `id` (uuid, primary key)
    - `email` (text, unique)
    - `password_hash` (text) - BCrypt hash
    - `role` (text) - user role (admin/user)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Email is unique
  - Password stored as BCrypt hash
  - No RLS needed (API handles auth)

  ## Initial Data
  - Creates default admin user (password will be hashed by API)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Note: Initial admin user should be created via API endpoint
-- This ensures password is properly hashed with BCrypt