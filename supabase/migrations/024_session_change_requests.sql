CREATE TABLE session_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  parent_id UUID NOT NULL REFERENCES parents(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('reschedule', 'cancellation')),
  parent_note TEXT,
  proposed_datetime TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_scr_session_id ON session_change_requests(session_id);
CREATE INDEX idx_scr_parent_id ON session_change_requests(parent_id);
CREATE INDEX idx_scr_status ON session_change_requests(status);

ALTER TABLE session_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scr: parent own" ON session_change_requests
  FOR ALL TO authenticated
  USING (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  )
  WITH CHECK (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  );

CREATE POLICY "scr: admin all" ON session_change_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
