import { createClient } from '@/lib/supabase/server'
import { CalendarDays } from 'lucide-react'
import NoticeBanners from '@/components/tutor/NoticeBanner'
import {
  stateToTimezone,
  formatSessionDate,
  formatSessionDateShort,
  formatTime,
  isTodayInTz,
  isTomorrowInTz,
} from '@/lib/timezone'

export const dynamic = 'force-dynamic'

export default async function TutorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, legal_name, state')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold mb-2">Welcome to Pocketnote</h1>
        <p className="text-muted-foreground text-sm">
          Your tutor profile is being set up. You&apos;ll hear from us shortly.
        </p>
      </div>
    )
  }

  const now = new Date().toISOString()

  // Fetch active notices not yet dismissed by this tutor
  const { data: allNotices } = await supabase
    .from('tutor_notices')
    .select('id, message, type')
    .eq('active', true)
    .order('created_at', { ascending: false })

  const { data: dismissals } = tutor
    ? await supabase
        .from('tutor_notice_dismissals')
        .select('notice_id')
        .eq('tutor_id', tutor.id)
    : { data: [] }

  const dismissedIds = new Set((dismissals ?? []).map((d: any) => d.notice_id))
  const visibleNotices = (allNotices ?? []).filter(n => !dismissedIds.has(n.id)) as {
    id: string; message: string; type: 'info' | 'warning' | 'action'
  }[]

  const [{ data: sessions }, { data: pastSessions }] = await Promise.all([
    supabase
      .from('sessions')
      .select(`
        id, scheduled_at, status, duration_minutes,
        bookings!inner (
          mode, location, status,
          students ( name, year_level, subjects ),
          parents ( name, phone )
        )
      `)
      .eq('bookings.tutor_id', tutor.id)
      .eq('bookings.status', 'confirmed')
      .eq('status', 'scheduled')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(20),
    supabase
      .from('sessions')
      .select('id, scheduled_at, bookings(students(name))')
      .lt('scheduled_at', now)
      .in('status', ['scheduled', 'completed'])
      .order('scheduled_at', { ascending: false })
      .limit(10),
  ])

  // Query progress_reports separately to avoid RLS interaction in join context
  const pastIds = (pastSessions ?? []).map(s => s.id)
  const reportedPastIds = new Set<string>()
  if (pastIds.length) {
    const { data: reports } = await supabase
      .from('progress_reports')
      .select('session_id')
      .in('session_id', pastIds)
    for (const r of reports ?? []) reportedPastIds.add(r.session_id)
  }

  const reportsdue = (pastSessions ?? []).filter(s => !reportedPastIds.has(s.id))

  const upcomingSessions = sessions ?? []
  const firstName = tutor.legal_name.split(' ')[0]
  const nextSession = upcomingSessions[0]
  const tz = stateToTimezone(tutor.state)

  function dateLabel(dateStr: string) {
    if (isTodayInTz(dateStr, tz)) return 'Today'
    if (isTomorrowInTz(dateStr, tz)) return 'Tomorrow'
    return formatSessionDate(dateStr, tz)
  }

  return (
    <div className="max-w-3xl space-y-8">

      {visibleNotices.length > 0 && <NoticeBanners notices={visibleNotices} />}

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/75 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -right-2 w-24 h-24 bg-white/5 rounded-full" />
        <h1 className="text-2xl font-bold mb-1 relative">Hello, {firstName}</h1>
        <p className="text-white/80 text-sm relative">
          {upcomingSessions.length > 0
            ? `You have ${upcomingSessions.length} upcoming session${upcomingSessions.length !== 1 ? 's' : ''} scheduled`
            : 'No upcoming sessions scheduled yet'}
        </p>
        {nextSession && (
          <div className="mt-4 bg-white/15 rounded-xl px-4 py-3 inline-flex items-center gap-3 relative">
            <CalendarDays className="w-4 h-4 text-white/80 shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">
                Next: {dateLabel(nextSession.scheduled_at)} at {formatTime(nextSession.scheduled_at, tz)}
              </p>
              <p className="text-white/70 text-xs">
                {(nextSession.bookings as any)?.students?.name}
                {' · '}
                {(nextSession.bookings as any)?.mode === 'online' ? 'Online' : (nextSession.bookings as any)?.location}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reports due */}
      {reportsdue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Reports due
          </h2>
          <div className="space-y-2">
            {reportsdue.map((s) => {
              const student = (s.bookings as any)?.students
              return (
                <a key={s.id} href={`/tutor/reports/${s.id}`}
                  className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{student?.name ?? 'Student'}</p>
                    <p className="text-xs text-muted-foreground">
                      Session on {formatSessionDateShort(s.scheduled_at, tz)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-700">Write report →</span>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming sessions list */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Upcoming sessions
        </h2>

        {!upcomingSessions.length ? (
          <div className="bg-white rounded-xl border border-border p-10 text-center">
            <p className="font-medium mb-1">No upcoming sessions</p>
            <p className="text-sm text-muted-foreground">Sessions will appear here once booked.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((s) => {
              const booking = s.bookings as any
              const student = booking?.students
              return (
                <div key={s.id} className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{dateLabel(s.scheduled_at)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatTime(s.scheduled_at, tz)}
                        {' · '}
                        {s.duration_minutes ?? 60} min
                        {' · '}
                        {booking?.mode === 'online' ? 'Online' : booking?.location ?? '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{student?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {student?.year_level}{student?.subjects?.length ? ` · ${student.subjects.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
