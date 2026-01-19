import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Quest = {
  id: string;
  title: string;
  description: string;
  addresses: string[];
  phones: string[];
  participants_min: number;
  participants_max: number;
  age_restriction: string;
  age_rating: string;
  price: number;
  duration: number;
  is_new: boolean;
  is_visible: boolean;
  main_image: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  sort_order: number;
};

export type DurationBadge = {
  id: string;
  duration: number;
  label: string;
  badge_image_url: string | null;
  created_at: string;
};

export type Settings = {
  id: string;
  vk_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  telegram_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  updated_at: string;
};

export type Booking = {
  id: string;
  quest_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  booking_date: string;
  participants_count: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Rule = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type AboutInfo = {
  id: string;
  title: string;
  content: string;
  mission: string;
  vision: string;
  updated_at: string;
};

export type Certificate = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  issued_date: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  customer_name: string;
  quest_title: string;
  rating: number;
  review_text: string;
  review_date: string;
  is_visible: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type Promotion = {
  id: string;
  title: string;
  description: string;
  discount_text: string;
  image_url: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuestSchedule = {
  id: string;
  quest_id: string;
  date: string;
  time_slot: string;
  price: number;
  is_booked: boolean;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
};
