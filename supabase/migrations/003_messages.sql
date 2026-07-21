-- ============================================================
-- Messages — per-booking threads between parents and tutors
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('parent', 'tutor')),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Parents can see and send messages on their own bookings
CREATE POLICY "messages: parent" ON messages
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- Tutors can see and send messages on their assigned bookings
CREATE POLICY "messages: tutor" ON messages
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
    )
  );

-- Admin can see all messages (read-only oversight)
CREATE POLICY "messages: admin all" ON messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable Realtime so clients receive live message inserts
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
