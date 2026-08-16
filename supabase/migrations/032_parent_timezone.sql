-- Store parent's preferred timezone as an IANA timezone string
ALTER TABLE parents ADD COLUMN IF NOT EXISTS timezone TEXT;
