import { createClient } from '@/lib/supabase/server'
import { format, isFuture } from 'date-fns'
import { CalendarDays } from 'lucide-react'

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
  const firstName = parent.name.split(' ')[0]

  return (
    <div className="max-w-3xl space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/75 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -right-2 w-24 h-24 bg-white/5 rounded-full" />
        <h1 className="text-2xl font-bold mb-1 relative">Hello, {firstName}</h1>
        <p className="text-white/80 text-sm relative">
          {upcomingSessions.length > 0
            ? `${upcomingSessions.length} upcoming session${upcomingSessions.length !== 1 ? 's' : ''} scheduled`
            : 'No upcoming sessions scheduled yet'}
        </p>
        {nextSession && (
          <div className="mt-4 bg-white/15 rounded-xl px-4 py-3 inline-flex items-center gap-3 relative">
            <CalendarDays className="w-4 h-4 text-white/80 shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">
                Next: {format(new Date(nextSession.scheduled_at), 'EEEE d MMMM')} at {format(new Date(nextSession.scheduled_at), 'h:mm a')}
              </p>
              <p className="text-white/70 text-xs">
                {(nextSession.booking.students as any)?.name}
                {' · '}
                with {(nextSession.booking.tutors as any)?.legal_name}
              </p>
            </div>
          </div>
        )}
      </div>

      {!bookings?.length ? (
        <EmptyState />
      ) : (
        <>
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
                  <div key={b.id} className="bg-white rounded-xl border border-border p-5">
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
              <div className="bg-white rounded-xl border border-border divide-y divide-border">
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
    <div className="bg-white rounded-xl border border-border p-10 text-center">
      <p className="font-medium mb-1">No sessions booked yet</p>
      <p className="text-sm text-muted-foreground">
        We&apos;re finding the right tutor for you. We&apos;ll be in touch soon.
      </p>
    </div>
  )
}
