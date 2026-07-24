-- Rate tiers (new table)
CREATE TABLE IF NOT EXISTS rate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hourly_rate_cents INT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tutor rate fields (new columns)
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS rate_tier_id UUID REFERENCES rate_tiers(id),
  ADD COLUMN IF NOT EXISTS hourly_rate_override_cents INT;

-- Extend existing invoices table with new columns
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS total_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'paid', 'rejected')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Invoice–session junction (new table)
CREATE TABLE IF NOT EXISTS invoice_sessions (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id),
  PRIMARY KEY (invoice_id, session_id)
);

-- RLS for rate_tiers
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "rate_tiers: public read" ON rate_tiers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "rate_tiers: admin all" ON rate_tiers FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS for invoice_sessions
ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "invoice_sessions: tutor own" ON invoice_sessions FOR ALL
    USING (invoice_id IN (
      SELECT id FROM invoices
      WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "invoice_sessions: admin all" ON invoice_sessions FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
