-- Add 'unconverted' to the enquiries status check constraint
DO $$
DECLARE
  c TEXT;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.enquiries'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE enquiries DROP CONSTRAINT %I', c);
  END IF;
END;
$$;

ALTER TABLE enquiries
  ADD CONSTRAINT enquiries_status_check
  CHECK (status IN ('new', 'contacted', 'confirmed', 'waitlisted', 'unconverted'));
