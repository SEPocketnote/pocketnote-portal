DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parents' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE parents ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;
