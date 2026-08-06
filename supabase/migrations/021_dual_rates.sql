-- Split rate_tiers into separate online and in-person rates
ALTER TABLE rate_tiers
  ADD COLUMN online_rate_cents INT,
  ADD COLUMN inperson_rate_cents INT;

UPDATE rate_tiers SET
  online_rate_cents = hourly_rate_cents,
  inperson_rate_cents = hourly_rate_cents;

ALTER TABLE rate_tiers
  ALTER COLUMN online_rate_cents SET NOT NULL,
  ALTER COLUMN inperson_rate_cents SET NOT NULL,
  DROP COLUMN hourly_rate_cents;

-- Split tutor rate overrides into online and in-person
ALTER TABLE tutors
  ADD COLUMN online_rate_override_cents INT,
  ADD COLUMN inperson_rate_override_cents INT;

UPDATE tutors SET
  online_rate_override_cents = hourly_rate_override_cents,
  inperson_rate_override_cents = hourly_rate_override_cents
WHERE hourly_rate_override_cents IS NOT NULL;

ALTER TABLE tutors DROP COLUMN hourly_rate_override_cents;

-- Flat rate override for a specific student with a specific tutor (ignores mode)
CREATE TABLE student_rate_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  rate_cents INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, tutor_id)
);

ALTER TABLE student_rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON student_rate_overrides
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Rate locked at booking creation (resolved from hierarchy: student override → tutor mode override → tier)
ALTER TABLE bookings ADD COLUMN rate_cents_snapshot INT;

-- Per-session rate stored when invoice is created (supports mixed-rate invoices)
ALTER TABLE invoice_sessions ADD COLUMN rate_cents INT;
