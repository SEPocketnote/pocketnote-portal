import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendParentWelcome, upsertBrevoContact } from '@/lib/brevo'
import { z } from 'zod'
import { addWeeks, format, parseISO, setHours, setMinutes } from 'date-fns'

const Schema = z.object({
  parentName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  studentName: z.string().min(1),
  yearLevel: z.string().optional(),
  subjects: z.string().optional(),
  tutorId: z.string().uuid(),
  packageId: z.string().uuid(),
  mode: z.enum(['online', 'in-person']),
  location: z.string().optional(),
  startDate: z.string().min(1),
  sessionTime: z.string().min(1),
  dayOfWeek: z.string().optional(),
})

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const d = parsed.data
  const admin = createAdminClient()

  // 1. Get package
  const { data: pkg } = await admin.from('packages').select('*').eq('id', d.packageId).single()
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 400 })

  // 2. Get tutor
  const { data: tutor } = await admin.from('tutors').select('legal_name').eq('id', d.tutorId).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 400 })

  // 3. Find or create parent record
  const email = d.parentEmail.toLowerCase().trim()
  let { data: parent } = await admin.from('parents').select('id, user_id').eq('email', email).maybeSingle()

  if (!parent) {
    // Create Supabase auth account
    const { data: authData } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    const authUserId = authData.user?.id

    // Set profile role to parent
    if (authUserId) {
      await admin.from('profiles').upsert({ id: authUserId, role: 'parent' }, { onConflict: 'id' })
    }

    const { data: newParent } = await admin.from('parents').insert({
      name: d.parentName,
      email,
      phone: d.parentPhone,
      user_id: authUserId ?? null,
    }).select('id, user_id').single()

    parent = newParent

    // Add to Brevo
    await upsertBrevoContact({
      email,
      firstName: d.parentName.split(' ')[0],
      lastName: d.parentName.split(' ').slice(1).join(' '),
    })
  }

  if (!parent) return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 })

  // 4. Create student
  const subjectsArr = d.subjects ? d.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
  const { data: student } = await admin.from('students').insert({
    parent_id: parent.id,
    name: d.studentName,
    year_level: d.yearLevel,
    subjects: subjectsArr,
  }).select('id').single()

  if (!student) return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })

  // 5. Create booking
  const { data: booking } = await admin.from('bookings').insert({
    parent_id: parent.id,
    student_id: student.id,
    tutor_id: d.tutorId,
    package_id: d.packageId,
    status: 'confirmed',
    mode: d.mode,
    location: d.location,
    start_date: d.startDate,
  }).select('id').single()

  if (!booking) return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })

  // 6. Generate sessions (weekly from start date)
  const [hours, minutes] = d.sessionTime.split(':').map(Number)
  const sessions = []
  let sessionDate = parseISO(d.startDate)
  sessionDate = setHours(setMinutes(sessionDate, minutes), hours)

  for (let i = 0; i < pkg.sessions_total; i++) {
    sessions.push({
      booking_id: booking.id,
      scheduled_at: addWeeks(sessionDate, i).toISOString(),
      status: 'scheduled',
    })
  }

  await admin.from('sessions').insert(sessions)

  // 7. Send parent welcome email
  const firstSession = format(sessionDate, 'EEEE d MMMM \'at\' h:mm a')
  await sendParentWelcome({
    name: d.parentName,
    email,
    tutorName: tutor.legal_name,
    firstSession,
  })

  return NextResponse.json({ id: booking.id })
}
