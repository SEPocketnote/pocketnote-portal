import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendParentWelcome, upsertBrevoContact } from '@/lib/brevo'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { addWeeks, format, isBefore, isEqual, parseISO, setHours, setMinutes } from 'date-fns'

const Schema = z.object({
  // Parent — either existing ID or new details
  parentId: z.string().uuid().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  // Student — either existing ID or new details
  studentId: z.string().uuid().optional(),
  studentName: z.string().optional(),
  yearLevel: z.string().optional(),
  subjects: z.string().optional(),
  // Booking
  tutorId: z.string().uuid(),
  mode: z.enum(['online', 'in-person']),
  location: z.string().optional(),
  startDate: z.string().min(1),
  sessionTime: z.string().min(1),
  scheduleType: z.enum(['single', 'weekly', 'fortnightly']),
  sessionsCount: z.number().int().min(1).max(200).optional(),
  recurrenceEndDate: z.string().optional(),
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

  if (!d.parentId && (!d.parentName || !d.parentEmail)) {
    return NextResponse.json({ error: 'Parent ID or name + email required' }, { status: 400 })
  }
  if (!d.studentId && !d.studentName) {
    return NextResponse.json({ error: 'Student ID or name required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Get tutor
  const { data: tutor } = await admin.from('tutors').select('legal_name').eq('id', d.tutorId).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 400 })

  // 2. Resolve parent
  let parent: { id: string; user_id: string | null; name: string; email: string } | null = null
  let authUserId: string | undefined

  if (d.parentId) {
    // Existing parent selected from search
    const { data } = await admin.from('parents').select('id, name, email, user_id').eq('id', d.parentId).single()
    if (!data) return NextResponse.json({ error: 'Parent not found' }, { status: 400 })
    parent = data
    authUserId = data.user_id ?? undefined

    if (!authUserId) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email?.toLowerCase() === data.email.toLowerCase())
      if (existing) {
        authUserId = existing.id
        await admin.from('parents').update({ user_id: authUserId }).eq('id', data.id)
      }
    }
  } else {
    // New parent
    const email = d.parentEmail!.toLowerCase().trim()
    let { data: existingParent } = await admin.from('parents').select('id, name, email, user_id').eq('email', email).maybeSingle()

    if (!existingParent) {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })

      if (!authError && authData.user) {
        authUserId = authData.user.id
      } else {
        const { data: { users } } = await admin.auth.admin.listUsers()
        const existing = users.find(u => u.email?.toLowerCase() === email)
        if (existing) authUserId = existing.id
      }

      if (authUserId) {
        await admin.from('profiles').upsert({ id: authUserId, role: 'parent' }, { onConflict: 'id' })
      }

      const { data: newParent } = await admin.from('parents').insert({
        name: d.parentName!,
        email,
        phone: d.parentPhone,
        user_id: authUserId ?? null,
      }).select('id, name, email, user_id').single()

      parent = newParent

      // Create Stripe customer for new parent (non-blocking)
      ;(async () => {
        const customer = await stripe.customers.create({
          name: d.parentName!,
          email,
          phone: d.parentPhone,
          metadata: { parent_id: newParent!.id },
        })
        await admin.from('parents').update({ stripe_customer_id: customer.id }).eq('id', newParent!.id)
      })().catch(err => console.error('[bookings] stripe customer create failed:', err))

      await upsertBrevoContact({
        email,
        firstName: d.parentName!.split(' ')[0],
        lastName: d.parentName!.split(' ').slice(1).join(' '),
      })
    } else {
      parent = existingParent
      authUserId = existingParent.user_id ?? undefined

      if (!authUserId) {
        const { data: { users } } = await admin.auth.admin.listUsers()
        const existing = users.find(u => u.email?.toLowerCase() === email)
        if (existing) {
          authUserId = existing.id
          await admin.from('parents').update({ user_id: authUserId }).eq('id', existingParent.id)
        }
      }
    }
  }

  if (!parent) return NextResponse.json({ error: 'Failed to resolve parent' }, { status: 500 })

  // 4. Resolve student
  let student: { id: string } | null = null

  if (d.studentId) {
    student = { id: d.studentId }
  } else {
    const subjectsArr = d.subjects ? d.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
    const { data: newStudent } = await admin.from('students').insert({
      parent_id: parent.id,
      name: d.studentName!,
      year_level: d.yearLevel,
      subjects: subjectsArr,
    }).select('id').single()
    student = newStudent
  }

  if (!student) return NextResponse.json({ error: 'Failed to resolve student' }, { status: 500 })

  // 5. Generate session dates
  const [hours, minutes] = d.sessionTime.split(':').map(Number)
  const intervalWeeks = d.scheduleType === 'fortnightly' ? 2 : 1
  let firstSession = parseISO(d.startDate)
  firstSession = setHours(setMinutes(firstSession, minutes), hours)

  const sessionDates: Date[] = []
  if (d.scheduleType === 'single') {
    sessionDates.push(firstSession)
  } else if (d.sessionsCount) {
    for (let i = 0; i < d.sessionsCount; i++) {
      sessionDates.push(addWeeks(firstSession, i * intervalWeeks))
    }
  } else if (d.recurrenceEndDate) {
    const end = parseISO(d.recurrenceEndDate)
    let cur = firstSession
    while (isBefore(cur, end) || isEqual(cur, end)) {
      sessionDates.push(cur)
      cur = addWeeks(cur, intervalWeeks)
    }
  }

  // 6. Create booking
  const { data: booking } = await admin.from('bookings').insert({
    parent_id: parent.id,
    student_id: student.id,
    tutor_id: d.tutorId,
    status: 'confirmed',
    mode: d.mode,
    location: d.location,
    start_date: d.startDate,
    schedule_type: d.scheduleType,
    sessions_count: sessionDates.length,
    recurrence_end_date: d.recurrenceEndDate ?? null,
  }).select('id').single()

  if (!booking) return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })

  // 7. Insert sessions
  await admin.from('sessions').insert(
    sessionDates.map(dt => ({
      booking_id: booking.id,
      scheduled_at: dt.toISOString(),
      status: 'scheduled',
    }))
  )

  // 8. Generate magic link and send welcome email (non-blocking)
  const firstSessionLabel = format(firstSession, 'EEEE d MMMM \'at\' h:mm a')
  ;(async () => {
    let inviteUrl: string | undefined
    if (authUserId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: parent!.email,
        options: { redirectTo: `${siteUrl}/auth/confirm` },
      })
      inviteUrl = linkData?.properties?.action_link
    }
    await sendParentWelcome({
      name: parent!.name,
      email: parent!.email,
      tutorName: tutor.legal_name,
      firstSession: firstSessionLabel,
      inviteUrl,
    })
  })().catch(err => console.error('[bookings] welcome email failed:', err))

  return NextResponse.json({ id: booking.id })
}
