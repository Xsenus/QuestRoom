/*
  # Add Sample Quest Schedule

  ## Overview
  Adds sample schedule data for quests for the next 2 weeks.
  Creates time slots for testing the booking system.

  ## Data Added
  - Time slots for all visible quests
  - Various times throughout the day
  - Different price points (3000₽ and 4000₽)
  - Covers 14 days starting from today
*/

-- Get quest IDs and add schedule
DO $$
DECLARE
  quest_record RECORD;
  schedule_date DATE;
  time_slots TEXT[] := ARRAY['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30', '22:00'];
  slot_time TEXT;
  price_value INTEGER;
BEGIN
  FOR quest_record IN SELECT id, price FROM quests WHERE is_visible = true
  LOOP
    FOR i IN 0..13 LOOP
      schedule_date := CURRENT_DATE + i;
      
      FOREACH slot_time IN ARRAY time_slots
      LOOP
        -- Determine price (some slots are more expensive)
        IF slot_time IN ('19:00', '20:30', '22:00') THEN
          price_value := CASE WHEN quest_record.price >= 3500 THEN 4000 ELSE 3500 END;
        ELSE
          price_value := quest_record.price;
        END IF;
        
        INSERT INTO quest_schedule (quest_id, date, time_slot, price, is_booked)
        VALUES (quest_record.id, schedule_date, slot_time::TIME, price_value, false)
        ON CONFLICT (quest_id, date, time_slot) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;