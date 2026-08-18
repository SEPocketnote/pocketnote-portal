-- Link a payment to the specific session it was recorded against (nullable — subscription
-- payments cover a billing period and don't map to a single session).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
