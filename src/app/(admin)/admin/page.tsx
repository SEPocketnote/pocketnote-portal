import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ count: enquiryCount }, { count: newCount }] = await Promise.all([
    supabase.from('enquiries').select('*', { count: 'exact', head: true }),
    supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <StatCard label="Total enquiries" value={enquiryCount ?? 0} />
        <StatCard label="New (unactioned)" value={newCount ?? 0} highlight={!!newCount} />
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-5 ${highlight ? 'border-primary' : 'border-border'}`}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
