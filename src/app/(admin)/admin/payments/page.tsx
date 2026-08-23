import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function PaymentsPage() {
  const admin = createAdminClient()

  const { data: payments } = await admin
    .from('payments')
    .select(`
      id, amount, status, paid_at, created_at, method, notes,
      bookings (
        id,
        parents ( id, name ),
        students ( name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (payments ?? []).map((p: any) => ({
    id: p.id,
    amount: p.amount as number,
    status: p.status as string,
    date: p.paid_at ?? p.created_at,
    method: p.method as string | null,
    notes: p.notes as string | null,
    bookingId: p.bookings?.id ?? null,
    parentId: p.bookings?.parents?.id ?? null,
    parentName: p.bookings?.parents?.name ?? '—',
    studentName: p.bookings?.students?.name ?? '—',
  }))

  const totalPaidCents = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const failedCount = rows.filter(r => r.status === 'failed').length
  const pendingCount = rows.filter(r => r.status === 'pending').length

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Payments</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total collected" value={`$${(totalPaidCents / 100).toFixed(2)}`} sub="all time" />
        <StatCard label="Failed" value={String(failedCount)} sub="need follow-up" highlight={failedCount > 0} />
        <StatCard label="Pending" value={String(pendingCount)} sub="not yet charged" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No payments recorded yet. They'll appear here as Stripe invoices are processed.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#F5F4F2]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(new Date(row.date), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    {row.parentId ? (
                      <Link href={`/admin/parents/${row.parentId}`} className="hover:text-primary hover:underline font-medium">
                        {row.parentName}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.parentName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.studentName}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    ${(row.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs capitalize">
                    {row.method ? row.method.replace(/_/g, ' ') : '—'}
                    {row.notes && <span className="ml-1 italic">· {row.notes}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.bookingId && (
                      <Link href={`/admin/bookings/${row.bookingId}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                        View booking →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-red-200 bg-red-50' : 'border-border bg-white'}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    refunded: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${styles[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  )
}
