CREATE TABLE tutor_notices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info', -- 'info', 'warning', 'action'
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

CREATE TABLE tutor_notice_dismissals (
  notice_id    UUID        REFERENCES tutor_notices(id) ON DELETE CASCADE,
  tutor_id     UUID        REFERENCES tutors(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, tutor_id)
);

ALTER TABLE tutor_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_notice_dismissals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active, non-expired notices
CREATE POLICY "read active notices" ON tutor_notices
  FOR SELECT TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Tutors can read and insert their own dismissals
CREATE POLICY "tutors read own dismissals" ON tutor_notice_dismissals
  FOR SELECT TO authenticated
  USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "tutors insert own dismissals" ON tutor_notice_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
