-- ============================================================
-- Payments v2 migration
-- All changes are additive — no existing columns modified or dropped.
-- ============================================================

-- ------------------------------------------------------------
-- bookings: payment & enrolment fields
-- ------------------------------------------------------------

-- Rate charged to parent for this enrolment (separate from tutor rate)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parent_rate_cents INT;

-- Groups multiple bookings (time slots) into one enrolment.
-- All slots in the same enrolment share this UUID.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS enrolment_id UUID;

-- Enrolment-level discount (session-level overrides take precedence)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percent', 'fixed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_value NUMERIC;

-- Optional fixed weekly payment day for auto parents (0=Mon … 6=Sun)
-- When set, payment_due_at is computed as next occurrence of this weekday
-- at payment_time (AEST) after the session, instead of session_time + 24hrs.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_day_of_week INT CHECK (payment_day_of_week BETWEEN 0 AND 6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_time TIME;

-- Admin must set this to true before session 1 of any enrolment can be charged.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS first_session_approved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_enrolment_id ON bookings(enrolment_id);

-- ------------------------------------------------------------
-- sessions: payment tracking
-- ------------------------------------------------------------

-- pending → paid / failed / waived / credited
-- NULL = legacy session not in new payment system
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS payment_status TEXT
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'waived', 'credited'));

-- When this session becomes eligible for charging.
-- Set at session creation: either next fixed payment day/time or scheduled_at + 24hrs.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ;

-- Session-level discount override (takes precedence over enrolment discount)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percent', 'fixed'));
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS discount_value NUMERIC;

-- Actual amount charged — recorded at time of charge for audit trail
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS charge_cents INT;

CREATE INDEX IF NOT EXISTS idx_sessions_payment_status ON sessions(payment_status);
CREATE INDEX IF NOT EXISTS idx_sessions_payment_due_at ON sessions(payment_due_at);

-- ------------------------------------------------------------
-- parents: auto-charge toggle
-- ------------------------------------------------------------

-- When false, cron skips this parent entirely. Admin charges manually.
ALTER TABLE parents ADD COLUMN IF NOT EXISTS auto_charge_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- session_credits
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_credits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  minutes             INT NOT NULL,
  credit_type         TEXT NOT NULL DEFAULT 'Goodwill',
  reason              TEXT,
  expires_at          DATE,
  source_session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  redeemed_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_parent_id ON session_credits(parent_id);
CREATE INDEX IF NOT EXISTS idx_credits_expires_at ON session_credits(expires_at);

ALTER TABLE session_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits: parent own" ON session_credits
  FOR SELECT TO authenticated
  USING (parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()));

CREATE POLICY "credits: admin all" ON session_credits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ------------------------------------------------------------
-- payment_decisions
-- Tracks admin decisions on sessions in the charge window
-- (e.g. cancellation during 24hr window — charge or waive?)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_decisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL,
  resolution        TEXT CHECK (resolution IN ('charge', 'waive')),
  resolution_reason TEXT,
  resolved_by       UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pd_session_id ON payment_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_pd_resolution  ON payment_decisions(resolution);

ALTER TABLE payment_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pd: admin all" ON payment_decisions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
