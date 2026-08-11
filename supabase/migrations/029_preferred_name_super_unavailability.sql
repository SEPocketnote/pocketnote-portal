-- Preferred name (shown to parents / public; legal_name stays on invoices)
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Superannuation details
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS super_details JSONB;

-- Temporary tutor unavailability blocks
CREATE TABLE IF NOT EXISTS tutor_unavailability (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id    UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_all_day  BOOLEAN NOT NULL DEFAULT true,
  start_time  TIME,
  end_time    TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tutor_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors manage own unavailability"
  ON tutor_unavailability FOR ALL
  USING (tutor_id = (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all unavailability"
  ON tutor_unavailability FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
