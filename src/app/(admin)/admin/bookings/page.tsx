import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function BookingsPage() {
  const supabase = await createClient()

  const [{ data: bookings }, { data: completedSessions }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, mode, student_id, created_at,
        parents ( name, email ),
        tutors ( legal_name ),
        students ( name ),
        packages ( type, sessions_total )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('booking_id, bookings(student_id)')
      .eq('status', 'completed'),
  ])

  // Build lifetime completed session count per student
  const lifetimeByStudent: Record<string, number> = {}
  for (const s of completedSessions ?? []) {
    const sid = (s.bookings as any)?.student_id
    if (sid) lifetimeByStudent[sid] = (lifetimeByStudent[sid] ?? 0) + 1
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Link
          href="/admin/bookings/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          Create booking
        </Link>
      </div>

      {!bookings?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No bookings yet</p>
          <p className="text-sm text-muted-foreground">Create your first booking to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tutor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Package</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sessions completed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((b) => {
                const pkg = b.packages as any
                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:text-primary">
                        {(b.parents as any)?.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{(b.parents as any)?.email}</div>
                    </td>
                    <td className="px-4 py-3">{(b.students as any)?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(b.tutors as any)?.legal_name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{pkg?.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lifetimeByStudent[b.student_id] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.status] ?? ''}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
