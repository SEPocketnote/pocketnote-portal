ALTER TABLE tutors
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'either'
  CHECK (mode IN ('online', 'in-person', 'either'));
