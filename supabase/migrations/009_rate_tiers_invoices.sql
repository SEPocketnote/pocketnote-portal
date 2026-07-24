-- Rate tiers
CREATE TABLE rate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hourly_rate_cents INT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE tutors
  ADD COLUMN rate_tier_id UUID REFERENCES rate_tiers(id),
  ADD COLUMN hourly_rate_override_cents INT;

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sessions_count INT NOT NULL,
  total_minutes INT NOT NULL,
  hourly_rate_cents INT NOT NULL,
  total_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'paid', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT
);

CREATE TABLE invoice_sessions (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id),
  PRIMARY KEY (invoice_id, session_id)
);

-- RLS
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_tiers: public read" ON rate_tiers FOR SELECT USING (true);
CREATE POLICY "rate_tiers: admin all" ON rate_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices: tutor own" ON invoices FOR ALL
  USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "invoices: admin all" ON invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_sessions: tutor own" ON invoice_sessions FOR ALL
  USING (invoice_id IN (SELECT id FROM invoices WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())));
CREATE POLICY "invoice_sessions: admin all" ON invoice_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
