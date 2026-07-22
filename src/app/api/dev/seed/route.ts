import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addWeeks, setHours, setMinutes } from 'date-fns'

// DEV ONLY — remove before deploying to production
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. Find or create tutor auth user
  let tutorUserId: string | undefined
  const { data: existingTutorAuth } = await admin.auth.admin.listUsers()
  const existingTutorUser = existingTutorAuth?.users?.find(u => u.email === 'sarah.tutor@example.com')

  if (existingTutorUser) {
    tutorUserId = existingTutorUser.id
  } else {
    const { data: tutorAuth } = await admin.auth.admin.createUser({
      email: 'sarah.tutor@example.com',
      email_confirm: true,
    })
    tutorUserId = tutorAuth.user?.id
  }

  if (tutorUserId) {
    await admin.from('profiles').upsert({ id: tutorUserId, role: 'tutor' }, { onConflict: 'id' })
  }

  // 2. Find or create tutor record
  let tutor: { id: string } | null = null
  const { data: existingTutor } = await admin.from('tutors').select('id').eq('email', 'sarah.tutor@example.com').maybeSingle()

  if (existingTutor) {
    tutor = existingTutor
  } else {
    const { data: newTutor, error: tutorError } = await admin.from('tutors').insert({
      user_id: tutorUserId,
      legal_name: 'Sarah Johnson',
      email: 'sarah.tutor@example.com',
      phone: '0412 345 678',
      location: 'Bondi',
      bio: 'Experienced maths and science tutor with 8 years teaching HSC students.',
      abn: '12 345 678 901',
      subjects: ['Maths', 'Physics', 'Chemistry'],
      year_levels: ['Year 10', 'Year 11', 'Year 12'],
      active: true,
      verified: true,
    }).select('id').single()
    if (tutorError) return NextResponse.json({ error: 'Failed to create tutor', detail: tutorError.message }, { status: 500 })
    tutor = newTutor
  }

  if (!tutor) return NextResponse.json({ error: 'Failed to get tutor' }, { status: 500 })

  // Always patch tutor with latest seed data (safe to re-run)
  await admin.from('tutors').update({
    state: 'NSW',
    postcode: '2061',
    credentials: ['Bachelor of Science (Mathematics), UNSW', 'Diploma of Education, UTS', 'HSC Marker — NESA'],
  }).eq('id', tutor.id)

  // 3. Use existing term package (seeded in 002_seed_packages.sql)
  const { data: pkg, error: pkgError } = await admin.from('packages').select('id').eq('type', 'term').single()
  if (pkgError || !pkg) return NextResponse.json({ error: 'Package not found — run migrations first', detail: pkgError?.message }, { status: 500 })

  // 4. Find or create parent auth user
  let parentUserId: string | undefined
  const existingParentUser = existingTutorAuth?.users?.find(u => u.email === 'jane.parent@example.com')

  if (existingParentUser) {
    parentUserId = existingParentUser.id
  } else {
    const { data: parentAuth } = await admin.auth.admin.createUser({
      email: 'jane.parent@example.com',
      email_confirm: true,
    })
    parentUserId = parentAuth.user?.id
  }

  if (parentUserId) {
    await admin.from('profiles').upsert({ id: parentUserId, role: 'parent' }, { onConflict: 'id' })
  }

  // 5. Find or create parent record
  let parent: { id: string } | null = null
  const { data: existingParent } = await admin.from('parents').select('id').eq('email', 'jane.parent@example.com').maybeSingle()

  if (existingParent) {
    parent = existingParent
  } else {
    const { data: newParent, error: parentError } = await admin.from('parents').insert({
      user_id: parentUserId,
      name: 'Jane Smith',
      email: 'jane.parent@example.com',
      phone: '0423 456 789',
    }).select('id').single()
    if (parentError) return NextResponse.json({ error: 'Failed to create parent', detail: parentError.message }, { status: 500 })
    parent = newParent
  }

  if (!parent) return NextResponse.json({ error: 'Failed to get parent' }, { status: 500 })

  // 6. Find or create student
  let student: { id: string } | null = null
  const { data: existingStudent } = await admin.from('students').select('id').eq('parent_id', parent.id).eq('name', 'Tom Smith').maybeSingle()

  if (existingStudent) {
    student = existingStudent
  } else {
    const { data: newStudent, error: studentError } = await admin.from('students').insert({
      parent_id: parent.id,
      name: 'Tom Smith',
      year_level: 'Year 11',
      subjects: ['Maths', 'Physics'],
    }).select('id').single()
    if (studentError || !newStudent) return NextResponse.json({ error: 'Failed to create student', detail: studentError?.message }, { status: 500 })
    student = newStudent
  }

  if (!student) return NextResponse.json({ error: 'Failed to get student' }, { status: 500 })

  // 7. Find or create booking
  let booking: { id: string } | null = null
  const { data: existingBooking } = await admin.from('bookings').select('id').eq('student_id', student.id).eq('tutor_id', tutor.id).maybeSingle()

  if (existingBooking) {
    booking = existingBooking
  } else {
    const startDate = addWeeks(new Date(), -3)
    const { data: newBooking, error: bookingError } = await admin.from('bookings').insert({
      parent_id: parent.id,
      student_id: student.id,
      tutor_id: tutor.id,
      package_id: pkg.id,
      status: 'confirmed',
      mode: 'online',
      start_date: startDate.toISOString().split('T')[0],
      sessions_completed: 0,
    }).select('id').single()
    if (bookingError || !newBooking) return NextResponse.json({ error: 'Failed to create booking', detail: bookingError?.message }, { status: 500 })
    booking = newBooking

    // Generate 10 weekly sessions (Tuesdays at 10am, starting 3 weeks ago)
    const sessionDate = setHours(setMinutes(startDate, 0), 10)
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booking_id: newBooking.id,
      scheduled_at: addWeeks(sessionDate, i).toISOString(),
      status: i < 4 ? 'completed' : 'scheduled',
    }))
    await admin.from('sessions').insert(sessions)
    await admin.from('bookings').update({ sessions_completed: 4 }).eq('id', newBooking.id)
  }

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    tutorId: tutor.id,
    parentId: parent.id,
  })
}
