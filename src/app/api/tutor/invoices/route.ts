import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRateCents } from '@/lib/rates'
import { stateToTimezone, dateStrInTz } from '@/lib/timezone'
import { z } from 'zod'

const CreateSchema = z.object({
  session_ids: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, state, rate_tier_id, online_rate_override_cents, inperson_rate_override_cents')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { session_ids, notes } = parsed.data
  const admin = createAdminClient()

  // Verify sessions belong to this tutor and are completed; fetch booking rate snapshot
  const { data: sessions } = await admin
    .from('sessions')
    .select('id, scheduled_at, status, duration_minutes, bookings!inner(tutor_id, student_id, mode, rate_cents_snapshot)')
    .in('id', session_ids)

  if (!sessions || sessions.length !== session_ids.length) {
    return NextResponse.json({ error: 'One or more sessions not found.' }, { status: 400 })
  }

  for (const s of sessions) {
    const booking = s.bookings as any
    if (booking?.tutor_id !== tutor.id) {
      return NextResponse.json({ error: 'One or more sessions do not belong to this tutor.' }, { status: 400 })
    }
    if (s.status !== 'completed') {
      return NextResponse.json({ error: 'All sessions must be completed before invoicing.' }, { status: 400 })
    }
  }

  // Check none are already invoiced
  const { data: existingLinks } = await admin
    .from('invoice_sessions')
    .select('session_id')
    .in('session_id', session_ids)

  if (existingLinks && existingLinks.length > 0) {
    return NextResponse.json({ error: 'One or more sessions are already included in an invoice.' }, { status: 400 })
  }

  // Build per-session rate map, falling back through the rate hierarchy if snapshot is missing
  const sessionRates: { id: string; minutes: number; rate_cents: number }[] = []

  for (const s of sessions) {
    const booking = s.bookings as any
    const minutes = s.duration_minutes ?? 60
    let rate_cents: number | null = booking?.rate_cents_snapshot ?? null

    // Fallback: resolve fresh if snapshot was not set (legacy bookings)
    if (!rate_cents) {
      const mode: 'online' | 'in-person' = booking?.mode === 'in-person' ? 'in-person' : 'online'
      rate_cents = await resolveRateCents({ tutorId: tutor.id, studentId: booking.student_id, mode, admin })
    }

    if (!rate_cents) {
      return NextResponse.json({ error: 'No pay rate set for one or more sessions. Contact admin.' }, { status: 400 })
    }

    sessionRates.push({ id: s.id, minutes, rate_cents })
  }

  // Calculate totals
  const total_minutes = sessionRates.reduce((sum, s) => sum + s.minutes, 0)
  const total_cents = sessionRates.reduce((sum, s) => sum + Math.round((s.minutes / 60) * s.rate_cents), 0)
  const sessions_count = sessions.length

  const tutorTz = stateToTimezone(tutor.state)
  const scheduledDates = sessions.map(s => s.scheduled_at).sort()
  const period_start = dateStrInTz(scheduledDates[0], tutorTz)
  const period_end = dateStrInTz(scheduledDates[scheduledDates.length - 1], tutorTz)

  // For the invoice header rate: use the most common rate across sessions (for display)
  const rateCounts = new Map<number, number>()
  for (const s of sessionRates) {
    rateCounts.set(s.rate_cents, (rateCounts.get(s.rate_cents) ?? 0) + 1)
  }
  const primaryRate = [...rateCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

  // Insert invoice
  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .insert({
      tutor_id: tutor.id,
      period_start,
      period_end,
      sessions_count,
      amount: total_cents,
      total_minutes,
      hourly_rate_cents: primaryRate,
      total_cents,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  // Insert invoice_sessions with per-session rate
  const { error: linksError } = await admin
    .from('invoice_sessions')
    .insert(sessionRates.map(s => ({
      invoice_id: invoice.id,
      session_id: s.id,
      rate_cents: s.rate_cents,
    })))

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  return NextResponse.json({ invoice })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices })
}
