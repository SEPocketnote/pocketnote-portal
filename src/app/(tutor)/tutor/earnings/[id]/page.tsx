import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function TutorInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, state')
    .eq('user_id', user.id)
    .single()

  if (!tutor) redirect('/tutor/earnings')

  // RLS ensures tutors can only read their own invoices
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('tutor_id', tutor.id)
    .single()

  if (!invoice) notFound()

  const admin = createAdminClient()
  const tz = stateToTimezone(tutor.state)

  const { data: invoiceSessions } = await admin
    .from('invoice_sessions')
    .select('session_id')
    .eq('invoice_id', id)

  const sessionIds = (invoiceSessions ?? []).map(s => s.session_id)
  let sessions: Array<{ id: string; scheduled_at: string; duration_minutes: number | null; student_name: string | null; mode: string | null }> = []

  if (sessionIds.length) {
    const { data: rawSessions } = await admin
      .from('sessions')
      .select(`
        id, scheduled_at, duration_minutes,
        bookings ( mode, students ( name ) )
      `)
      .in('id', sessionIds)
      .order('scheduled_at', { ascending: true })

    sessions = (rawSessions ?? []).map(s => ({
      id: s.id,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      student_name: (s.bookings as any)?.students?.name ?? null,
      mode: (s.bookings as any)?.mode ?? null,
    }))
  }

  const hrs = Math.floor(invoice.total_minutes / 60)
  const mins = invoice.total_minutes % 60

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/tutor/earnings" className="text-sm text-muted-foreground hover:text-primary">← Back to earnings</Link>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <div className="flex items-center gap-3">
          {(invoice.status === 'approved' || invoice.status === 'paid') && (
            <a
              href={`/api/tutor/invoices/${id}/pdf`}
              className="btn text-sm px-3 py-1.5 flex items-center gap-1.5"
              download
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </a>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[invoice.status] ?? 'bg-muted text-muted-foreground'}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Invoice details */}
      <section className="bg-white rounded-2xl shadow-md p-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Invoice details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Period</dt>
            <dd className="font-medium mt-0.5">
              {format(new Date(invoice.period_start), 'd MMM yyyy')} – {format(new Date(invoice.period_end), 'd MMM yyyy')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Submitted</dt>
            <dd className="font-medium mt-0.5">{format(new Date(invoice.submitted_at), 'd MMM yyyy')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sessions</dt>
            <dd className="font-medium mt-0.5">{invoice.sessions_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total time</dt>
            <dd className="font-medium mt-0.5">{hrs}h{mins > 0 ? ` ${mins}m` : ''}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rate</dt>
            <dd className="font-medium mt-0.5">${(invoice.hourly_rate_cents / 100).toFixed(2)}/hr</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="font-semibold mt-0.5 text-lg">${(invoice.total_cents / 100).toFixed(2)}</dd>
          </div>
          {invoice.paid_at && (
            <div>
              <dt className="text-xs text-muted-foreground">Paid on</dt>
              <dd className="font-medium mt-0.5">{format(new Date(invoice.paid_at), 'd MMM yyyy')}</dd>
            </div>
          )}
        </dl>
        {invoice.notes && (
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-1">Your notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}
        {invoice.status === 'rejected' && invoice.rejection_reason && (
          <div className="border-t border-red-100 pt-3">
            <p className="text-xs font-semibold text-red-600 mb-1">Rejection reason</p>
            <p className="text-sm text-red-800">{invoice.rejection_reason}</p>
          </div>
        )}
      </section>

      {/* Sessions list */}
      <section className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</p>
        </div>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{s.student_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSessionFull(s.scheduled_at, tz)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-muted-foreground">{s.duration_minutes ?? 60} min</span>
                {s.mode && (
                  <p className="text-xs text-muted-foreground capitalize">{s.mode}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
