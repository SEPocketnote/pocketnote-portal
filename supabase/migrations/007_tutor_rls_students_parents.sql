-- Allow tutors to read students and parents linked to their bookings

CREATE POLICY "students: tutor via booking" ON students
  FOR SELECT USING (
    id IN (
      SELECT student_id FROM bookings
      WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "parents: tutor via booking" ON parents
  FOR SELECT USING (
    id IN (
      SELECT parent_id FROM bookings
      WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
    )
  );
