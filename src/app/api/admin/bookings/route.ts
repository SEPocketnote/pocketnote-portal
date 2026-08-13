import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendParentWelcome, sendBookingConfirmation, sendTutorBookingNotification, upsertBrevoContact } from '@/lib/brevo'
import { stripe } from '@/lib/stripe'
import { createBookingSubscription } from '@/lib/stripe-subscriptions'
import { z } from 'zod'
import { addWeeks, isBefore, isEqual, parseISO } from 'date-fns'
import { stateToTimezone, toUtcFromZoned, formatSessionFull } from '@/lib/timezone'
import { resolveRateCents } from '@/lib/rates'

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
  durationMinutes: z.number().int().min(15).max(360).optional(),
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
  const { data: tutor } = await admin.from('tutors').select('legal_name, preferred_name, email, state').eq('id', d.tutorId).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 400 })

  // Resolve rate now — we need student ID first, so we do this after student resolution below

  // 2. Resolve parent
  let parent: { id: string; user_id: string | null; name: string; email: string } | null = null
  let authUserId: string | undefined
  let isNewParent = false

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
    // New parent details entered — check if they already exist by email
    const email = d.parentEmail!.toLowerCase().trim()
    const { data: existingParent } = await admin.from('parents').select('id, name, email, user_id').eq('email', email).maybeSingle()

    if (!existingParent) {
      isNewParent = true

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

      // Create Stripe customer before inserting parent so the ID is stored atomically
      let stripeCustomerId: string | null = null
      try {
        const customer = await stripe.customers.create({
          name: d.parentName!,
          email,
          phone: d.parentPhone,
        })
        stripeCustomerId = customer.id
      } catch (err) {
        console.error('[bookings] stripe customer create failed:', err)
        return NextResponse.json({ error: 'Failed to create payment account. Please try again.' }, { status: 502 })
      }

      const { data: newParent } = await admin.from('parents').insert({
        name: d.parentName!,
        email,
        phone: d.parentPhone,
        user_id: authUserId ?? null,
        stripe_customer_id: stripeCustomerId,
      }).select('id, name, email, user_id').single()

      parent = newParent

      await upsertBrevoContact({
        email,
        firstName: d.parentName!.split(' ')[0],
        lastName: d.parentName!.split(' ').slice(1).join(' '),
      })
    } else {
      // Email typed matches an existing parent record
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

  // 5. Resolve rate for this booking
  const rate_cents_snapshot = await resolveRateCents({
    tutorId: d.tutorId,
    studentId: student.id,
    mode: d.mode,
    admin,
  })

  // 7. Generate session dates
  const intervalWeeks = d.scheduleType === 'fortnightly' ? 2 : 1
  const tutorTimezone = stateToTimezone(tutor.state)
  // Interpret the admin's entered date+time in the tutor's local timezone
  const firstSession = toUtcFromZoned(`${d.startDate}T${d.sessionTime}`, tutorTimezone)

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
  } else {
    // Ongoing — generate 52 weeks (1 year) of sessions upfront
    const weeksToGenerate = intervalWeeks === 2 ? 26 : 52
    for (let i = 0; i < weeksToGenerate; i++) {
      sessionDates.push(addWeeks(firstSession, i * intervalWeeks))
    }
  }

  const durationMinutes = d.durationMinutes ?? 60
  const isOngoing = d.scheduleType !== 'single' && !d.sessionsCount && !d.recurrenceEndDate

  // 8. Create booking
  const { data: booking } = await admin.from('bookings').insert({
    parent_id: parent.id,
    student_id: student.id,
    tutor_id: d.tutorId,
    status: 'confirmed',
    mode: d.mode,
    location: d.location,
    start_date: d.startDate,
    schedule_type: d.scheduleType,
    sessions_count: isOngoing ? null : sessionDates.length,
    recurrence_end_date: d.recurrenceEndDate ?? null,
    rate_cents_snapshot: rate_cents_snapshot ?? null,
    duration_minutes: durationMinutes,
  }).select('id').single()

  if (!booking) return NextResponse.json({ error: 'Failed to create enrolment' }, { status: 500 })

  // 9. Create Stripe subscription for recurring bookings (if parent has a card on file)
  if (d.scheduleType !== 'single' && booking) {
    try {
      const { data: parentFull } = await admin
        .from('parents')
        .select('stripe_customer_id, default_payment_method_id')
        .eq('id', parent.id)
        .single()

      if (parentFull?.stripe_customer_id && parentFull?.default_payment_method_id && rate_cents_snapshot) {
        const subId = await createBookingSubscription({
          stripeCustomerId: parentFull.stripe_customer_id,
          paymentMethodId: parentFull.default_payment_method_id,
          rateCents: rate_cents_snapshot,
          durationMinutes: durationMinutes,
          scheduleType: d.scheduleType as 'weekly' | 'fortnightly',
          firstSessionDate: firstSession,
        })
        await admin.from('bookings').update({ stripe_subscription_id: subId }).eq('id', booking.id)
      }
    } catch (err) {
      console.error('[bookings] stripe subscription create failed:', err)
      // Non-fatal — booking is created, subscription can be set up later
    }
  }

  // 11. Insert sessions
  await admin.from('sessions').insert(
    sessionDates.map(dt => ({
      booking_id: booking.id,
      scheduled_at: dt.toISOString(),
      status: 'scheduled',
      duration_minutes: durationMinutes,
    }))
  )

  // 12. Send email — welcome + magic link for new parents, booking confirmation for existing
  const firstSessionLabel = formatSessionFull(firstSession, tutorTimezone)
  try {
    if (isNewParent && authUserId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: parent!.email,
        options: { redirectTo: `${siteUrl}/auth/callback` },
      })
      const tutorDisplayName = (tutor as any).preferred_name?.trim() || tutor.legal_name
      await sendParentWelcome({
        name: parent!.name,
        email: parent!.email,
        tutorName: tutorDisplayName,
        firstSession: firstSessionLabel,
        inviteUrl: linkData?.properties?.action_link,
      })
    } else {
      const tutorDisplayName = (tutor as any).preferred_name?.trim() || tutor.legal_name
      await sendBookingConfirmation({
        name: parent!.name,
        email: parent!.email,
        tutorName: tutorDisplayName,
        firstSession: firstSessionLabel,
      })
    }
  } catch (err) {
    console.error('[bookings] email failed:', err)
  }

  // Notify tutor of new enrolment
  if (tutor?.email) {
    try {
      const tutorDisplayName = (tutor as any).preferred_name?.trim() || tutor.legal_name
      await sendTutorBookingNotification({
        tutorName: tutorDisplayName,
        tutorEmail: tutor.email,
        studentName: d.studentName ?? 'your new student',
        parentName: parent!.name,
        parentPhone: d.parentPhone ?? null,
        parentEmail: parent!.email,
        firstSession: firstSessionLabel,
        mode: d.mode,
        location: d.location ?? null,
      })
    } catch (err) {
      console.error('[bookings] tutor email failed:', err)
    }
  }

  return NextResponse.json({ id: booking.id })
}
