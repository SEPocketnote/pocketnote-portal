import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFuture } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { stateToTimezone, formatSessionDate, formatSessionDateShortTime, formatTime } from '@/lib/timezone'

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
      id, status, mode, location, sessions_count, schedule_type, tutor_id,
      packages ( type, sessions_total ),
      students ( name, year_level ),
      sessions ( id, scheduled_at, status, duration_minutes )
    `)
    .eq('parent_id', parent.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  // Tutors RLS restricts reads to own row — fetch names via admin client
  const tutorIds = [...new Set((bookings ?? []).map((b: any) => b.tutor_id).filter(Boolean))]
  const admin = createAdminClient()
  const { data: tutorRows } = tutorIds.length
    ? await admin.from('tutors').select('id, slug, legal_name, bio, photo_url, subjects, location, state').in('id', tutorIds)
    : { data: [] }
  const tutorMap: Record<string, any> = {}
  for (const t of tutorRows ?? []) tutorMap[t.id] = t
  const tutorNames: Record<string, string> = {}
  for (const t of tutorRows ?? []) tutorNames[t.id] = t.legal_name

  const upcomingSessions = bookings?.flatMap((b) =>
    (b.sessions as any[])
      .filter((s) => s.status === 'scheduled' && isFuture(new Date(s.scheduled_at)))
      .map((s) => ({ ...s, booking: b }))
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ?? []

  const nextSession = upcomingSessions[0]
  const firstName = parent.name.split(' ')[0]
  const nextTz = nextSession ? stateToTimezone(tutorMap[(nextSession.booking as any).tutor_id]?.state) : 'Australia/Sydney'

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
                Next: {formatSessionDate(nextSession.scheduled_at, nextTz)} at {formatTime(nextSession.scheduled_at, nextTz)}
              </p>
              <p className="text-white/70 text-xs">
                {(nextSession.booking.students as any)?.name}
                {' · '}
                with {tutorNames[(nextSession.booking as any).tutor_id] ?? 'TBC'}
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
                const sessions = b.sessions as any[]
                const completed = sessions.filter(s => s.status === 'completed').length
                const total = (b as any).sessions_count ?? pkg?.sessions_total ?? 0
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium capitalize">
                          {pkg?.type ? `${pkg.type} pack` : (b as any).schedule_type ?? 'Sessions'} — {(b.students as any)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          with {tutorNames[(b as any).tutor_id] ?? 'tutor TBC'}
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

          {/* Tutor cards */}
          {(tutorRows ?? []).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {(tutorRows ?? []).length === 1 ? 'Your tutor' : 'Your tutors'}
              </h2>
              <div className="space-y-3">
                {(tutorRows ?? []).map((t: any) => (
                  <a
                    key={t.id}
                    href={`/profile/${t.slug ?? t.id}`}
                    className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 hover:border-primary/40 transition-colors block"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {t.photo_url ? (
                        <img src={t.photo_url} alt={t.legal_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-medium text-muted-foreground">
                          {t.legal_name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{t.legal_name}</p>
                        <span className="text-xs text-primary shrink-0">View profile →</span>
                      </div>
                      {(t.location || t.state) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{[t.location, t.state].filter(Boolean).join(', ')}</p>
                      )}
                      {t.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.bio}</p>
                      )}
                      {(t.subjects as string[] | null)?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(t.subjects as string[]).slice(0, 4).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">{s}</span>
                          ))}
                          {(t.subjects as string[]).length > 4 && (
                            <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">+{(t.subjects as string[]).length - 4} more</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

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
                        {formatSessionDateShortTime(s.scheduled_at, stateToTimezone(tutorMap[(s.booking as any).tutor_id]?.state))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(s.booking.mode === 'online') ? 'Online' : s.booking.location}
                        {' · '}{s.duration_minutes ?? 60} min
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
