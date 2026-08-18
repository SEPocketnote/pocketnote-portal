import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format } from 'date-fns'
import { stateToTimezone, formatTime } from '@/lib/timezone'
import { stripe } from '@/lib/stripe'
import SessionRow from './SessionRow'
import BookingStatus from './BookingStatus'
import EnrolmentActions from './EnrolmentActions'
import CancelAllSessions from './CancelAllSessions'

function scheduleLabel(booking: any) {
  const type = booking.schedule_type
  if (!type || type === 'single') return 'Single session'
  const freq = type === 'weekly' ? 'Weekly' : 'Fortnightly'
  if (booking.sessions_count) return `${freq} · ${booking.sessions_count} sessions`
  if (booking.recurrence_end_date) return `${freq} · until ${format(new Date(booking.recurrence_end_date), 'd MMM yyyy')}`
  return `${freq} · ongoing`
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: booking }, { data: sessions }, { data: tutors }, { data: payments }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, mode, location, start_date, schedule_type, sessions_count, recurrence_end_date,
        stripe_subscription_id, rate_cents_snapshot,
        parents ( id, name, email, phone ),
        students ( name, year_level, subjects ),
        tutors ( id, legal_name, preferred_name, email, state )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('sessions')
      .select('id, scheduled_at, status, duration_minutes, progress_reports(covered, went_well, needs_work, next_session_plan, notes)')
      .eq('booking_id', id)
      .order('scheduled_at', { ascending: true }),
    admin.from('tutors').select('id, legal_name, preferred_name').eq('active', true).order('legal_name'),
    admin.from('payments').select('id, amount, status, paid_at, created_at, method, notes, stripe_invoice_id, stripe_charge_id').eq('booking_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  // Fetch Stripe subscription status if one exists
  let stripeSubStatus: string | null = null
  const subId = (booking as any)?.stripe_subscription_id as string | null
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      stripeSubStatus = sub.status
    } catch {
      stripeSubStatus = 'unknown'
    }
  }

  if (!booking) notFound()

  const parent = booking.parents as any
  const student = booking.students as any
  const tutor = booking.tutors as any
  const tutorTimezone = stateToTimezone(tutor?.state)

  const now = new Date().toISOString()
  const futureSessions = (sessions ?? []).filter(s => s.scheduled_at > now && s.status === 'scheduled')
  const firstFutureTime = futureSessions.length > 0
    ? formatTime(futureSessions[0].scheduled_at, tutorTimezone).replace(/\s*(AM|PM)/i, m => m.toLowerCase())
    : null

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href={parent?.id ? `/admin/parents/${parent.id}` : '/admin/parents'} className="text-sm text-muted-foreground hover:text-primary">
          ← {parent?.name ?? 'Parents'}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{student?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href={`/admin/parents/${parent?.id}`} className="hover:text-primary hover:underline">{parent?.name}</Link>
            {' · '}
            <Link href={`/admin/tutors/${tutor?.id}`} className="hover:text-primary hover:underline">{(tutor as any)?.preferred_name?.trim() || tutor?.legal_name}</Link>
          </p>
        </div>
        <BookingStatus bookingId={id} currentStatus={booking.status} />
      </div>

      {/* Summary */}
      <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolment details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Mode" value={booking.mode} />
          <Info label="Schedule" value={scheduleLabel(booking)} />
          <Info label="Start date" value={booking.start_date ? format(new Date(booking.start_date), 'd MMM yyyy') : null} />
          {booking.location && <Info label="Location" value={booking.location} />}
          <Info label="Student year" value={student?.year_level} />
          <Info label="Subjects" value={student?.subjects?.join(', ')} />
        </dl>
      </section>

      {/* Parent & tutor contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <section className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</h2>
            <Link href={`/admin/parents/${parent?.id}`} className="text-xs text-primary hover:underline">View profile →</Link>
          </div>
          <p className="text-sm font-medium">{parent?.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{parent?.email}</p>
          {parent?.phone && <p className="text-xs text-muted-foreground">{parent.phone}</p>}
        </section>
        <section className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutor</h2>
            <Link href={`/admin/tutors/${tutor?.id}`} className="text-xs text-primary hover:underline">View profile →</Link>
          </div>
          <p className="text-sm font-medium">{(tutor as any)?.preferred_name?.trim() || tutor?.legal_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tutor?.email}</p>
        </section>
      </div>

      {/* Billing */}
      <section className="bg-white rounded-2xl shadow-md p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</h2>
          <div className="flex items-center gap-2">
            {subId && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                stripeSubStatus === 'active' ? 'bg-green-100 text-green-700' :
                stripeSubStatus === 'past_due' ? 'bg-amber-100 text-amber-700' :
                stripeSubStatus === 'canceled' ? 'bg-red-100 text-red-700' :
                'bg-muted text-muted-foreground'
              }`}>
                Subscription {stripeSubStatus ?? '—'}
              </span>
            )}
          </div>
        </div>
        {!subId && booking?.schedule_type !== 'single' && (
          <p className="text-xs text-muted-foreground mb-3">No Stripe subscription — parent has not saved a card yet.</p>
        )}
        {payments && payments.length > 0 ? (
          <div className="divide-y divide-border">
            {payments.map((p: any) => {
              const METHOD_LABEL: Record<string, string> = {
                stripe_subscription: 'Subscription',
                stripe_invoice: 'Stripe invoice',
                stripe_charge: 'Stripe charge',
                ndis: 'NDIS',
                bank_transfer: 'Bank transfer',
                cash: 'Cash',
                other: 'Other',
              }
              const methodLabel = METHOD_LABEL[p.method] ?? p.method ?? 'Payment'
              const ref = p.stripe_invoice_id || p.stripe_charge_id || null
              const refShort = ref ? ref.slice(0, 16) + (ref.length > 16 ? '…' : '') : null
              return (
                <div key={p.id} className="py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                        p.status === 'paid' ? 'bg-green-500' :
                        p.status === 'failed' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <div>
                        <span className="font-medium">{methodLabel}</span>
                        <span className="text-muted-foreground ml-2">
                          {p.paid_at
                            ? format(new Date(p.paid_at), 'd MMM yyyy')
                            : format(new Date(p.created_at), 'd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium tabular-nums ${p.status === 'failed' ? 'text-red-600' : ''}`}>
                        ${(p.amount / 100).toFixed(2)}
                      </span>
                      <span className={`capitalize w-12 text-right ${
                        p.status === 'paid' ? 'text-green-700' :
                        p.status === 'failed' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>{p.status}</span>
                    </div>
                  </div>
                  {(refShort || p.notes) && (
                    <div className="ml-3.5 mt-1 text-muted-foreground space-y-0.5">
                      {refShort && <p className="font-mono">{refShort}</p>}
                      {p.notes && <p className="italic">{p.notes}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-1">No payments recorded yet.</p>
        )}
      </section>

      {/* Enrolment actions */}
      <div className="mt-4">
        <EnrolmentActions
          bookingId={id}
          currentTutorId={tutor?.id ?? ''}
          tutors={(tutors ?? []) as { id: string; legal_name: string; preferred_name?: string | null }[]}
          currentStatus={booking.status}
          futureSessionTime={firstFutureTime}
          timezone={tutorTimezone}
        />
      </div>

      {/* Sessions list */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sessions ({sessions?.length ?? 0})
          </h2>
          <CancelAllSessions
            bookingId={id}
            scheduledCount={(sessions ?? []).filter(s => s.status === 'scheduled').length}
          />
        </div>
        {!sessions?.length ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center text-sm text-muted-foreground">
            No sessions found.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md divide-y divide-border">
            {sessions.map((session, i) => (
              <SessionRow
                key={session.id}
                sessionId={session.id}
                index={i + 1}
                scheduledAt={session.scheduled_at}
                status={session.status}
                durationMinutes={session.duration_minutes ?? 60}
                timezone={tutorTimezone}
                rateCentsSnapshot={(booking as any).rate_cents_snapshot ?? null}
                report={(session as any).progress_reports ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
