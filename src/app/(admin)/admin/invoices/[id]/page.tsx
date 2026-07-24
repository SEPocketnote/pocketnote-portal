import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import InvoiceActions from './InvoiceActions'

export const dynamic = 'force-dynamic'

export default async function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  // Get tutor
  const { data: tutor } = await admin
    .from('tutors')
    .select('id, legal_name, email')
    .eq('id', invoice.tutor_id)
    .single()

  // Get sessions in this invoice
  const { data: invoiceSessions } = await admin
    .from('invoice_sessions')
    .select('session_id')
    .eq('invoice_id', id)

  const sessionIds = (invoiceSessions ?? []).map(s => s.session_id)
  let sessions: Array<{ id: string; scheduled_at: string; duration_minutes: number | null; student_name: string | null }> = []

  if (sessionIds.length) {
    const { data: rawSessions } = await admin
      .from('sessions')
      .select(`
        id, scheduled_at, duration_minutes,
        bookings ( students ( name ) )
      `)
      .in('id', sessionIds)
      .order('scheduled_at', { ascending: true })

    sessions = (rawSessions ?? []).map(s => ({
      id: s.id,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      student_name: (s.bookings as any)?.students?.name ?? null,
    }))
  }

  const hrs = Math.floor(invoice.total_minutes / 60)
  const mins = invoice.total_minutes % 60

  const STATUS_STYLES: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/admin/invoices" className="text-sm text-muted-foreground hover:text-primary">← Back to invoices</a>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{tutor?.legal_name ?? '—'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tutor?.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[invoice.status] ?? 'bg-muted text-muted-foreground'}`}>
          {invoice.status}
        </span>
      </div>

      {/* Invoice summary */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-3 mb-4">
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
            <p className="text-xs text-muted-foreground mb-1">Tutor notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}
      </section>

      {/* Sessions list */}
      <section className="bg-white rounded-lg border border-border overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</p>
        </div>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{s.student_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{s.duration_minutes ?? 60} min</span>
            </div>
          ))}
        </div>
      </section>

      {/* Status management + admin notes */}
      <InvoiceActions
        invoiceId={id}
        status={invoice.status}
        adminNotes={invoice.admin_notes ?? ''}
      />
    </div>
  )
}
