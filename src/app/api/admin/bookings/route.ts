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

  let authUserId: string | undefined

  if (!parent) {
    // New parent — create auth account
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })

    if (!authError && authData.user) {
      authUserId = authData.user.id
    } else {
      // Already registered — look up existing auth user
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email?.toLowerCase() === email)
      if (existing) authUserId = existing.id
    }

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
  } else {
    // Existing parent — resolve auth user ID for magic link generation
    if (parent.user_id) {
      authUserId = parent.user_id
    } else {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email?.toLowerCase() === email)
      if (existing) {
        authUserId = existing.id
        await admin.from('parents').update({ user_id: authUserId }).eq('id', parent.id)
      }
    }
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

  // 7. Generate magic link and send parent welcome email (non-blocking)
  const firstSession = format(sessionDate, 'EEEE d MMMM \'at\' h:mm a')
  ;(async () => {
    let inviteUrl: string | undefined
    if (authUserId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${siteUrl}/auth/confirm` },
      })
      inviteUrl = linkData?.properties?.action_link
    }
    await sendParentWelcome({
      name: d.parentName,
      email,
      tutorName: tutor.legal_name,
      firstSession,
      inviteUrl,
    })
  })().catch(err => console.error('[bookings] welcome email failed:', err))

  return NextResponse.json({ id: booking.id })
}
