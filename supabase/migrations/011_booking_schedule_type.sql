-- Make package_id optional (schedule type now drives session generation)
ALTER TABLE bookings
  ALTER COLUMN package_id DROP NOT NULL;

-- Add scheduling fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS schedule_type TEXT
    CHECK (schedule_type IN ('single', 'weekly', 'fortnightly')),
  ADD COLUMN IF NOT EXISTS sessions_count INT,
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
