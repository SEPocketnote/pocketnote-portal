import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default async function AdminInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: invoices } = await admin
    .from('invoices')
    .select('*')
    .order('submitted_at', { ascending: false })

  // Fetch tutor names separately to avoid RLS join issues
  const tutorIds = [...new Set((invoices ?? []).map(i => i.tutor_id))]
  const tutorNames: Record<string, string> = {}
  if (tutorIds.length) {
    const { data: tutors } = await admin
      .from('tutors')
      .select('id, legal_name')
      .in('id', tutorIds)
    for (const t of tutors ?? []) tutorNames[t.id] = t.legal_name
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6">Invoices</h1>

      {!invoices?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          No invoices submitted yet.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {invoices.map((inv) => {
              const hrs = Math.floor(inv.total_minutes / 60)
              const mins = inv.total_minutes % 60
              return (
                <a
                  key={inv.id}
                  href={`/admin/invoices/${inv.id}`}
                  className="block bg-white rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-medium truncate">{tutorNames[inv.tutor_id] ?? '—'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_STYLES[inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(inv.period_start), 'd MMM')} – {format(new Date(inv.period_end), 'd MMM yy')}
                    {' · '}{hrs}h{mins > 0 ? ` ${mins}m` : ''}
                    {' · '}<span className="font-medium text-foreground">${(inv.total_cents / 100).toFixed(2)}</span>
                  </p>
                </a>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const hrs = Math.floor(inv.total_minutes / 60)
                    const mins = inv.total_minutes % 60
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{tutorNames[inv.tutor_id] ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(inv.period_start), 'd MMM')} – {format(new Date(inv.period_end), 'd MMM yy')}
                        </td>
                        <td className="px-4 py-3">{inv.sessions_count}</td>
                        <td className="px-4 py-3">{hrs}h{mins > 0 ? ` ${mins}m` : ''}</td>
                        <td className="px-4 py-3 font-medium">${(inv.total_cents / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(inv.submitted_at), 'd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/admin/invoices/${inv.id}`} className="text-xs text-primary hover:underline">
                            View
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
