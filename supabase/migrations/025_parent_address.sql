ALTER TABLE parents ADD COLUMN IF NOT EXISTS address TEXT;

CREATE TABLE address_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id),
  current_address TEXT,
  proposed_address TEXT NOT NULL,
  parent_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_acr_parent_id ON address_change_requests(parent_id);
CREATE INDEX idx_acr_status ON address_change_requests(status);

ALTER TABLE address_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acr: parent own" ON address_change_requests
  FOR ALL TO authenticated
  USING (parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()))
  WITH CHECK (parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()));

CREATE POLICY "acr: admin all" ON address_change_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
