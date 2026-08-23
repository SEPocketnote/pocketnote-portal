import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import RequestCard from './RequestCard'
import AddressRequestCard from './AddressRequestCard'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()

  const [
    { data: pendingSession },
    { data: resolvedSession },
    { data: pendingAddress },
    { data: resolvedAddress },
  ] = await Promise.all([
    admin
      .from('session_change_requests')
      .select(`
        id, request_type, parent_note, proposed_datetime, status, created_at,
        parents ( id, name, email ),
        sessions ( id, scheduled_at, duration_minutes, bookings ( id, students ( name ), tutors ( id, legal_name, preferred_name, state ) ) )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('session_change_requests')
      .select(`
        id, request_type, status, resolved_at,
        parents ( id, name ),
        sessions ( id, scheduled_at, bookings ( students ( name ), tutors ( state ) ) )
      `)
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })
      .limit(10),
    admin
      .from('address_change_requests')
      .select('id, current_address, proposed_address, parent_note, status, created_at, parents(id, name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('address_change_requests')
      .select('id, proposed_address, status, resolved_at, parents(id, name)')
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false })
      .limit(10),
  ])

  const totalPending = (pendingSession?.length ?? 0) + (pendingAddress?.length ?? 0)
  const statusStyles: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">
        Requests {totalPending > 0 ? <span className="text-lg text-muted-foreground font-normal">({totalPending} pending)</span> : ''}
      </h1>

      {/* Pending session change requests */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Session changes {pendingSession?.length ? `(${pendingSession.length})` : ''}
        </h2>
        {!pendingSession?.length ? (
          <div className="bg-white rounded-2xl shadow-card p-6 text-center text-sm text-muted-foreground">
            No pending session requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSession.map((req: any) => {
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

      {/* Pending address change requests */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Address updates {pendingAddress?.length ? `(${pendingAddress.length})` : ''}
        </h2>
        {!pendingAddress?.length ? (
          <div className="bg-white rounded-2xl shadow-card p-6 text-center text-sm text-muted-foreground">
            No pending address requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAddress.map((req: any) => (
              <AddressRequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>

      {/* Recently resolved */}
      {(!!resolvedSession?.length || !!resolvedAddress?.length) && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Recently resolved
          </h2>
          <div className="bg-white rounded-2xl shadow-card divide-y divide-border">
            {[
              ...(resolvedSession ?? []).map((r: any) => ({ ...r, _type: 'session' })),
              ...(resolvedAddress ?? []).map((r: any) => ({ ...r, _type: 'address' })),
            ]
              .sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime())
              .slice(0, 15)
              .map((req: any) => {
                const tz = req._type === 'session'
                  ? stateToTimezone(req.sessions?.bookings?.tutors?.state)
                  : 'Australia/Sydney'
                const label = req._type === 'session'
                  ? `${req.request_type} · ${formatSessionDateFullYear(req.sessions?.scheduled_at, tz)}`
                  : `Address update · ${req.proposed_address}`
                return (
                  <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{(req.parents as any)?.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{label}</p>
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
