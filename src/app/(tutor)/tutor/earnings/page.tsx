import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export default async function TutorEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: invoices } = tutor
    ? await supabase
        .from('invoices')
        .select('*')
        .eq('tutor_id', tutor.id)
        .order('submitted_at', { ascending: false })
    : { data: [] }

  const totalPaid = invoices?.filter((i) => i.paid_at).reduce((sum, i) => sum + i.amount, 0) ?? 0
  const totalPending = invoices?.filter((i) => !i.paid_at).reduce((sum, i) => sum + i.amount, 0) ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Earnings</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-border p-5">
          <p className="text-sm text-muted-foreground mb-1">Pending payment</p>
          <p className="text-2xl font-semibold text-primary">${(totalPending / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-5">
          <p className="text-sm text-muted-foreground mb-1">Total paid</p>
          <p className="text-2xl font-semibold">${(totalPaid / 100).toFixed(2)}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Invoices
        </h2>
        {!invoices?.length ? (
          <div className="bg-white rounded-lg border border-border p-10 text-center">
            <p className="font-medium mb-1">No invoices yet</p>
            <p className="text-sm text-muted-foreground">Invoice submission coming soon.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(inv.period_start), 'd MMM')} – {format(new Date(inv.period_end), 'd MMM yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">{inv.sessions_count} sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(inv.amount / 100).toFixed(2)}</p>
                  <p className={`text-xs ${inv.paid_at ? 'text-green-600' : inv.approved_at ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {inv.paid_at ? 'Paid' : inv.approved_at ? 'Approved' : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
