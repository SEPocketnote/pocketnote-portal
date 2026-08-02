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
    .select('id, state, rate_tier_id, hourly_rate_override_cents')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) redirect('/tutor/earnings')

  const admin = createAdminClient()

  // Get effective rate
  let hourly_rate_cents: number | null = tutor.hourly_rate_override_cents ?? null
  if (!hourly_rate_cents && tutor.rate_tier_id) {
    const { data: tier } = await admin
      .from('rate_tiers')
      .select('hourly_rate_cents')
      .eq('id', tutor.rate_tier_id)
      .single()
    if (tier) hourly_rate_cents = tier.hourly_rate_cents
  }

  if (!hourly_rate_cents) redirect('/tutor/earnings')

  // Get all completed sessions for this tutor
  const { data: allCompletedSessions } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, duration_minutes,
      bookings!inner ( tutor_id, students ( name ) )
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

  const sessions = uninvoiced.map(s => ({
    id: s.id,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
    student_name: (s.bookings as any)?.students?.name ?? null,
  }))

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/tutor/earnings" className="text-sm text-muted-foreground hover:text-primary">← Back to earnings</a>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Create Invoice</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Review your uninvoiced sessions below, then submit for admin approval.
      </p>

      <InvoiceForm sessions={sessions} hourlyRateCents={hourly_rate_cents} timezone={stateToTimezone(tutor.state)} />
    </div>
  )
}
