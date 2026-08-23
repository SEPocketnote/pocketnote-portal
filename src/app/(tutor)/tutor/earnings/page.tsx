import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import Link from 'next/link'

function getPayCycleBanner() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Australia/Sydney',
    weekday: 'long', hour: 'numeric', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''

  const weekday = get('weekday')
  const hour = parseInt(get('hour'))
  const year = parseInt(get('year'))
  const month = parseInt(get('month')) - 1
  const day = parseInt(get('day'))

  const DAY_NUM: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
  }
  const dayNum = DAY_NUM[weekday] ?? 0

  // Days to next Tuesday 6pm Sydney
  let daysToDeadline: number
  if (dayNum === 2 && hour < 18) daysToDeadline = 0
  else if (dayNum === 2 && hour >= 18) daysToDeadline = 7
  else if (dayNum === 1) daysToDeadline = 1
  else if (dayNum === 0) daysToDeadline = 2
  else daysToDeadline = (2 - dayNum + 7) % 7 || 7

  // Compute deadline display date (add days to Sydney local date, then format)
  const deadlineDate = new Date(Date.UTC(year, month, day + daysToDeadline))
  const deadlineLabel = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(deadlineDate)

  const isUrgent = daysToDeadline <= 1
  const isPast = dayNum === 2 && hour >= 18

  return { deadlineLabel: `${deadlineLabel}, 6:00 pm`, isUrgent, isPast, daysToDeadline }
}

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function TutorEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get tutor with rate info
  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, state, mode, rate_tier_id, online_rate_override_cents, inperson_rate_override_cents, bank_details')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">Tutor profile not found.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const tz = stateToTimezone(tutor.state)

  // Get effective rates
  let onlineRateCents: number | null = tutor.online_rate_override_cents ?? null
  let inpersonRateCents: number | null = tutor.inperson_rate_override_cents ?? null
  let rateLabel = 'Custom rate'

  if ((!onlineRateCents || !inpersonRateCents) && tutor.rate_tier_id) {
    const { data: tier } = await admin
      .from('rate_tiers')
      .select('online_rate_cents, inperson_rate_cents, name')
      .eq('id', tutor.rate_tier_id)
      .single()
    if (tier) {
      if (!onlineRateCents) onlineRateCents = tier.online_rate_cents
      if (!inpersonRateCents) inpersonRateCents = tier.inperson_rate_cents
      rateLabel = tier.name
    }
  }

  // For estimating uninvoiced earnings, use the tutor's primary mode rate
  const tutorMode = tutor.mode ?? 'either'
  const primaryRate = tutorMode === 'in-person'
    ? inpersonRateCents
    : onlineRateCents  // online or either → use online rate for estimate
  const hasAnyRate = !!(onlineRateCents || inpersonRateCents)

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

  // Get session IDs already in invoices — query separately to avoid RLS join issues
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

  // Get past invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('submitted_at', { ascending: false })

  const totalPaid = (invoices ?? []).filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_cents, 0)
  const totalPending = (invoices ?? []).filter(i => i.status !== 'paid' && i.status !== 'rejected').reduce((sum, i) => sum + i.total_cents, 0)

  // Estimate for uninvoiced (best-effort using primary rate)
  const uninvoicedMinutes = uninvoiced.reduce((sum, s) => sum + (s.duration_minutes ?? 60), 0)
  const uninvoicedEstimate = primaryRate
    ? Math.round((uninvoicedMinutes / 60) * primaryRate)
    : null

  const payCycle = getPayCycleBanner()
  const bankDetails = tutor.bank_details as { account_name?: string; bsb?: string; account_number?: string } | null
  const hasBankDetails = !!(bankDetails?.account_name && bankDetails?.bsb && bankDetails?.account_number)

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">Earnings</h1>

      {/* No bank details warning */}
      {!hasBankDetails && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Bank details required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              We don&apos;t have your bank account on file yet. Add your details in your profile so we can pay you.
            </p>
          </div>
          <Link href="/tutor/profile" className="shrink-0 text-sm font-medium text-amber-800 underline hover:opacity-80">
            Add now →
          </Link>
        </div>
      )}

      {/* Pay cycle banner */}
      <div className={`rounded-lg border px-5 py-4 ${payCycle.isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-semibold ${payCycle.isUrgent ? 'text-orange-800' : 'text-blue-800'}`}>
              {payCycle.isPast
                ? 'Invoice window closed for this week'
                : payCycle.isUrgent
                  ? 'Invoice due today!'
                  : 'Invoice submission reminder'}
            </p>
            <p className={`text-sm mt-0.5 ${payCycle.isUrgent ? 'text-orange-700' : 'text-blue-700'}`}>
              {payCycle.isPast
                ? `The Tuesday 6:00 pm deadline has passed. Any uninvoiced sessions will roll into next week's payment run.`
                : `Submit your invoice by ${payCycle.deadlineLabel} (Sydney time) to be included in this week's payment run. Pay week runs Monday to Sunday.`}
            </p>
          </div>
          {uninvoiced.length > 0 && hasAnyRate && !payCycle.isPast && (
            <Link href="/tutor/earnings/new" className="shrink-0 btn btn-primary text-sm px-4 py-2 whitespace-nowrap">
              Submit now
            </Link>
          )}
        </div>
      </div>

      {/* Rate banner or no-rate warning */}
      {!hasAnyRate ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-800">
          No pay rate has been assigned to your account yet. Contact your admin to set up your rate before submitting invoices.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {onlineRateCents && (
            <span>Online: <span className="font-semibold text-foreground">${(onlineRateCents / 100).toFixed(2)}/hr</span></span>
          )}
          {inpersonRateCents && (
            <span>In-person: <span className="font-semibold text-foreground">${(inpersonRateCents / 100).toFixed(2)}/hr</span></span>
          )}
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Pending payment</p>
          <p className="text-2xl font-semibold text-primary">${(totalPending / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Total paid</p>
          <p className="text-2xl font-semibold">${(totalPaid / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Uninvoiced sessions */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Uninvoiced sessions
        </h2>
        {uninvoiced.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center text-sm text-muted-foreground">
            No completed sessions awaiting invoicing.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="divide-y divide-border">
              {uninvoiced.map((s) => {
                const student = (s.bookings as any)?.students
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{student?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.duration_minutes ?? 60} min</span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-border px-5 py-4 bg-muted/30 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{uninvoiced.length} session{uninvoiced.length !== 1 ? 's' : ''}</span>
                <span className="text-muted-foreground"> · {Math.floor(uninvoicedMinutes / 60)}h {uninvoicedMinutes % 60 > 0 ? `${uninvoicedMinutes % 60}m` : ''}</span>
                {uninvoicedEstimate !== null && (
                  <span className="text-muted-foreground"> · ~${(uninvoicedEstimate / 100).toFixed(2)} estimated</span>
                )}
              </div>
              {hasAnyRate && (
                <Link href="/tutor/earnings/new" className="btn btn-primary text-sm px-4 py-2">
                  Create Invoice
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Invoice history */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Invoice history
        </h2>
        {!invoices?.length ? (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center text-sm text-muted-foreground">
            No invoices submitted yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-border/50">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/tutor/earnings/${inv.id}`} className="block px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(inv.period_start), 'd MMM')} – {format(new Date(inv.period_end), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.sessions_count} session{inv.sessions_count !== 1 ? 's' : ''}
                      {' · '}
                      {Math.floor(inv.total_minutes / 60)}h{inv.total_minutes % 60 > 0 ? ` ${inv.total_minutes % 60}m` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-sm">${(inv.total_cents / 100).toFixed(2)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                {inv.status === 'rejected' && inv.rejection_reason && (
                  <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                    <span className="font-semibold">Reason: </span>{inv.rejection_reason}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
