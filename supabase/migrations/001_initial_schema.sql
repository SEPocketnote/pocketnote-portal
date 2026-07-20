-- ============================================================
-- Pocketnote Portal — Initial Schema
-- ============================================================

-- profiles: one row per auth.users entry, stores role
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'tutor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatically create a profile row when a user signs up (role assigned by admin or trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Default role is 'parent'; admin reassigns tutor/admin manually
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'parent');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year_level TEXT,
  subjects TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  legal_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  abn TEXT,
  wwcc_number TEXT,
  wwcc_expiry DATE,
  date_of_birth DATE,
  address TEXT,
  -- Stored encrypted at rest via Supabase; do not expose via API
  bank_details JSONB,
  super_details JSONB,
  subjects TEXT[] DEFAULT '{}',
  year_levels TEXT[] DEFAULT '{}',
  location TEXT,
  bio TEXT,
  photo_url TEXT,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  -- 0=Sunday … 6=Saturday
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE (tutor_id, day_of_week, start_time)
);

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('single', 'starter', 'term')),
  sessions_total INT NOT NULL,
  -- Prices in cents (AUD)
  price_in_person INT NOT NULL,
  price_online INT NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- Enquiry / waitlist
-- ============================================================

CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  student_name TEXT NOT NULL,
  year_level TEXT,
  subjects TEXT[] DEFAULT '{}',
  location TEXT,
  mode_preference TEXT CHECK (mode_preference IN ('in-person', 'online', 'either')),
  preferred_days TEXT[] DEFAULT '{}',
  preferred_times TEXT,
  how_heard TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'waitlisted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  year_level TEXT,
  location TEXT,
  mode TEXT CHECK (mode IN ('in-person', 'online', 'either')),
  status TEXT NOT NULL DEFAULT 'waiting',
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- Bookings & sessions
-- ============================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id),
  student_id UUID NOT NULL REFERENCES students(id),
  tutor_id UUID NOT NULL REFERENCES tutors(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  mode TEXT NOT NULL CHECK (mode IN ('in-person', 'online')),
  location TEXT,
  start_date DATE,
  stripe_payment_intent_id TEXT,
  sessions_completed INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  reminder_sent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id),
  covered TEXT,
  went_well TEXT,
  needs_work TEXT,
  next_session_plan TEXT,
  notes TEXT,
  -- 1–5; internal only, not shown to parents
  internal_rating SMALLINT CHECK (internal_rating BETWEEN 1 AND 5),
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- Payments & invoices
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- Amount in cents
  amount INT NOT NULL,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  -- 1 = upfront / first payment, 2 = session-5 instalment
  instalment SMALLINT CHECK (instalment IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sessions_count INT NOT NULL,
  -- Amount in cents
  amount INT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_sessions_booking_id ON sessions(booking_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_bookings_parent_id ON bookings(parent_id);
CREATE INDEX idx_bookings_tutor_id ON bookings(tutor_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_invoices_tutor_id ON invoices(tutor_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own
CREATE POLICY "profiles: own row" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Packages: publicly readable (used on booking pages)
CREATE POLICY "packages: public read" ON packages
  FOR SELECT USING (TRUE);

-- Enquiries: insert only (public form), admin reads all
CREATE POLICY "enquiries: public insert" ON enquiries
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "enquiries: admin all" ON enquiries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Parents: own row + admin
CREATE POLICY "parents: own row" ON parents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "parents: admin all" ON parents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students: parent owns, admin can see all
CREATE POLICY "students: parent owns" ON students
  FOR ALL USING (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  );

CREATE POLICY "students: admin all" ON students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tutors: own row + admin
CREATE POLICY "tutors: own row" ON tutors
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "tutors: admin all" ON tutors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tutor availability: tutor owns, admin can see all
CREATE POLICY "tutor_availability: tutor owns" ON tutor_availability
  FOR ALL USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "tutor_availability: admin all" ON tutor_availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bookings: parent sees own, tutor sees assigned, admin sees all
CREATE POLICY "bookings: parent" ON bookings
  FOR SELECT USING (
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings: tutor" ON bookings
  FOR SELECT USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings: admin all" ON bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sessions: same visibility as bookings
CREATE POLICY "sessions: parent" ON sessions
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "sessions: tutor" ON sessions
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "sessions: admin all" ON sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Progress reports: tutor submits own, parent reads for their sessions
CREATE POLICY "progress_reports: tutor" ON progress_reports
  FOR ALL USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "progress_reports: parent read" ON progress_reports
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN bookings b ON b.id = s.booking_id
      JOIN parents p ON p.id = b.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_reports: admin all" ON progress_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments: parent sees own, admin all
CREATE POLICY "payments: parent" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "payments: admin all" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invoices: tutor sees own, admin all
CREATE POLICY "invoices: tutor" ON invoices
  FOR ALL USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "invoices: admin all" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
