-- Allow tutors to read students and parents linked to their bookings.
--
-- Plain subqueries on `bookings` inside a students/parents RLS policy create
-- a recursion cycle (students policy → bookings → students join → ...) that
-- Supabase silently resolves by returning empty results. SECURITY DEFINER
-- functions bypass RLS when querying bookings, breaking the cycle.

CREATE OR REPLACE FUNCTION tutor_accessible_student_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT DISTINCT student_id FROM bookings
  WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  AND student_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION tutor_accessible_parent_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT DISTINCT parent_id FROM bookings
  WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  AND parent_id IS NOT NULL
$$;

CREATE POLICY "students: tutor via booking" ON students
  FOR SELECT USING (id IN (SELECT tutor_accessible_student_ids()));

CREATE POLICY "parents: tutor via booking" ON parents
  FOR SELECT USING (id IN (SELECT tutor_accessible_parent_ids()));
