import { createClient } from '@/lib/supabase/server'
import { format, isFuture } from 'date-fns'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name')
    .eq('user_id', user!.id)
    .single()

  if (!parent) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold mb-2">Welcome to Pocketnote</h1>
        <p className="text-muted-foreground text-sm">
          Your account is being set up. You&apos;ll receive an email once your first session is booked.
        </p>
      </div>
    )
  }

  // Load active bookings with sessions and tutor
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, mode, location, sessions_completed,
      packages ( type, sessions_total ),
      tutors ( legal_name, bio, photo_url ),
      students ( name, year_level ),
      sessions ( id, scheduled_at, status )
    `)
    .eq('parent_id', parent.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  const upcomingSessions = bookings?.flatMap((b) =>
    (b.sessions as any[])
      .filter((s) => s.status === 'scheduled' && isFuture(new Date(s.scheduled_at)))
      .map((s) => ({ ...s, booking: b }))
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ?? []

  const nextSession = upcomingSessions[0]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Hello, {parent.name.split(' ')[0]}</h1>

      {!bookings?.length ? (
        <EmptyState />
      ) : (
        <>
          {/* Next session */}
          {nextSession && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Next session
              </h2>
              <div className="bg-white rounded-lg border border-border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {format(new Date(nextSession.scheduled_at), 'EEEE d MMMM')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {format(new Date(nextSession.scheduled_at), 'h:mm a')}
                      {' · '}
                      {(nextSession.booking.mode === 'online') ? 'Online' : nextSession.booking.location}
                    </p>
                  </div>
                  <span className="text-sm bg-secondary text-primary px-3 py-1 rounded-full font-medium">
                    {(nextSession.booking.students as any)?.name}
                  </span>
                </div>
                {(nextSession.booking.tutors as any)?.legal_name && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Tutor: <span className="text-foreground font-medium">{(nextSession.booking.tutors as any).legal_name}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Package progress */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Your packages
            </h2>
            <div className="space-y-3">
              {bookings!.map((b) => {
                const pkg = b.packages as any
                const completed = b.sessions_completed
                const total = pkg?.sessions_total ?? 0
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={b.id} className="bg-white rounded-lg border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium capitalize">
                          {pkg?.type} pack — {(b.students as any)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          with {(b.tutors as any)?.legal_name ?? 'tutor TBC'}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {completed}/{total} sessions
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Upcoming sessions list */}
          {upcomingSessions.length > 1 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Upcoming sessions
              </h2>
              <div className="bg-white rounded-lg border border-border divide-y divide-border">
                {upcomingSessions.slice(1).map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(s.scheduled_at), 'EEE d MMM · h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(s.booking.mode === 'online') ? 'Online' : s.booking.location}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(s.booking.students as any)?.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-border p-10 text-center">
      <p className="font-medium mb-1">No sessions booked yet</p>
      <p className="text-sm text-muted-foreground">
        We&apos;re finding the right tutor for you. We&apos;ll be in touch soon.
      </p>
    </div>
  )
}
