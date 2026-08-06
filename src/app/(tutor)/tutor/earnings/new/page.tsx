import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { stateToTimezone } from '@/lib/timezone'
import InvoiceForm from './InvoiceForm'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, state, rate_tier_id, online_rate_override_cents, inperson_rate_override_cents')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) redirect('/tutor/earnings')

  const admin = createAdminClient()

  // Resolve tier rates as fallback
  let tierOnlineCents: number | null = null
  let tierInpersonCents: number | null = null
  if (tutor.rate_tier_id) {
    const { data: tier } = await admin
      .from('rate_tiers')
      .select('online_rate_cents, inperson_rate_cents')
      .eq('id', tutor.rate_tier_id)
      .single()
    if (tier) {
      tierOnlineCents = tier.online_rate_cents
      tierInpersonCents = tier.inperson_rate_cents
    }
  }

  const hasAnyRate = !!(
    tutor.online_rate_override_cents || tutor.inperson_rate_override_cents ||
    tierOnlineCents || tierInpersonCents
  )
  if (!hasAnyRate) redirect('/tutor/earnings')

  // Get all completed sessions with their booking mode and rate snapshot
  const { data: allCompletedSessions } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, duration_minutes,
      bookings!inner ( tutor_id, mode, rate_cents_snapshot, students ( name ) )
    `)
    .eq('status', 'completed')
    .eq('bookings.tutor_id', tutor.id)
    .order('scheduled_at', { ascending: false })

  // Filter out already-invoiced sessions
  const completedIds = (allCompletedSessions ?? []).map(s => s.id)
  const invoicedSessionIds = new Set<string>()
  if (completedIds.length) {
    const { data: links } = await admin
      .from('invoice_sessions')
      .select('session_id')
      .in('session_id', completedIds)
    for (const l of links ?? []) invoicedSessionIds.add(l.session_id)
  }

  const uninvoiced = (allCompletedSessions ?? []).filter(s => !invoicedSessionIds.has(s.id))

  if (uninvoiced.length === 0) redirect('/tutor/earnings')

  const sessions = uninvoiced.map(s => {
    const booking = s.bookings as any
    const bookingMode: 'online' | 'in-person' = booking?.mode === 'in-person' ? 'in-person' : 'online'

    // Resolve rate: snapshot → tutor override → tier
    let rate_cents: number | null = booking?.rate_cents_snapshot ?? null
    if (!rate_cents) {
      const override = bookingMode === 'online'
        ? tutor.online_rate_override_cents
        : tutor.inperson_rate_override_cents
      rate_cents = override ?? (bookingMode === 'online' ? tierOnlineCents : tierInpersonCents)
    }

    return {
      id: s.id,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      student_name: booking?.students?.name ?? null,
      rate_cents: rate_cents ?? 0,
    }
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/tutor/earnings" className="text-sm text-muted-foreground hover:text-primary">← Back to earnings</a>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Create Invoice</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Review your uninvoiced sessions below, then submit for admin approval.
      </p>

      <InvoiceForm sessions={sessions} timezone={stateToTimezone(tutor.state)} />
    </div>
  )
}
