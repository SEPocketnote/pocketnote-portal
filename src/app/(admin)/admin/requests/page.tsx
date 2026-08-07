import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import RequestCard from './RequestCard'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()

  const [{ data: pending }, { data: resolved }] = await Promise.all([
    admin
      .from('session_change_requests')
      .select(`
        id, request_type, parent_note, proposed_datetime, status, created_at,
        parents ( id, name, email ),
        sessions ( id, scheduled_at, duration_minutes, bookings ( id, students ( name ), tutors ( id, legal_name, state ) ) )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('session_change_requests')
      .select(`
        id, request_type, status, admin_note, resolved_at, created_at,
        parents ( id, name ),
        sessions ( id, scheduled_at, bookings ( students ( name ), tutors ( state ) ) )
      `)
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Session requests</h1>

      {/* Pending */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Pending {pending?.length ? `(${pending.length})` : ''}
        </h2>
        {!pending?.length ? (
          <div className="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req: any) => {
              const tz = stateToTimezone(req.sessions?.bookings?.tutors?.state)
              return (
                <RequestCard
                  key={req.id}
                  req={req}
                  tz={tz}
                  sessionDate={formatSessionDateFullYear(req.sessions?.scheduled_at, tz)}
                  sessionTime={formatTime(req.sessions?.scheduled_at, tz)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Resolved */}
      {!!resolved?.length && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Recently resolved
          </h2>
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {resolved.map((req: any) => {
              const tz = stateToTimezone((req.sessions as any)?.bookings?.tutors?.state)
              const statusStyles: Record<string, string> = {
                approved: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
              }
              return (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {(req.parents as any)?.name} · {(req.sessions as any)?.bookings?.students?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionDateFullYear(req.sessions?.scheduled_at, tz)} · {req.request_type}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyles[req.status] ?? ''}`}>
                    {req.status}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
