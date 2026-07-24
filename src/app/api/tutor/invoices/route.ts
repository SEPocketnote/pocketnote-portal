import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CreateSchema = z.object({
  session_ids: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get tutor with rate info
  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, rate_tier_id, hourly_rate_override_cents')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { session_ids, notes } = parsed.data
  const admin = createAdminClient()

  // Get effective rate
  let hourly_rate_cents: number | null = tutor.hourly_rate_override_cents ?? null
  if (!hourly_rate_cents && tutor.rate_tier_id) {
    const { data: tier } = await admin
      .from('rate_tiers')
      .select('hourly_rate_cents')
      .eq('id', tutor.rate_tier_id)
      .single()
    hourly_rate_cents = tier?.hourly_rate_cents ?? null
  }

  if (!hourly_rate_cents) {
    return NextResponse.json({ error: 'No rate assigned. Contact admin.' }, { status: 400 })
  }

  // Verify sessions belong to this tutor's bookings and are 'completed'
  const { data: sessions } = await admin
    .from('sessions')
    .select('id, scheduled_at, status, duration_minutes, bookings!inner(tutor_id)')
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

  // Check none of those sessions are already in invoice_sessions
  const { data: existingLinks } = await admin
    .from('invoice_sessions')
    .select('session_id')
    .in('session_id', session_ids)

  if (existingLinks && existingLinks.length > 0) {
    return NextResponse.json({ error: 'One or more sessions are already included in an invoice.' }, { status: 400 })
  }

  // Calculate totals
  const total_minutes = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 60), 0)
  const total_cents = Math.round((total_minutes / 60) * hourly_rate_cents)
  const sessions_count = sessions.length

  const scheduledDates = sessions.map(s => s.scheduled_at).sort()
  const period_start = scheduledDates[0].split('T')[0]
  const period_end = scheduledDates[scheduledDates.length - 1].split('T')[0]

  // Insert invoice
  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .insert({
      tutor_id: tutor.id,
      period_start,
      period_end,
      sessions_count,
      total_minutes,
      hourly_rate_cents,
      total_cents,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  // Insert invoice_sessions
  const { error: linksError } = await admin
    .from('invoice_sessions')
    .insert(session_ids.map(session_id => ({ invoice_id: invoice.id, session_id })))

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
