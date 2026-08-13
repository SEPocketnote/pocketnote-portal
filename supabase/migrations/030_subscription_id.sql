-- Stripe subscription ID per booking (weekly/fortnightly bookings only)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Link payments back to the Stripe invoice that triggered them
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Unique constraint so webhook upserts are idempotent
ALTER TABLE payments ADD CONSTRAINT payments_stripe_invoice_id_unique UNIQUE (stripe_invoice_id);
