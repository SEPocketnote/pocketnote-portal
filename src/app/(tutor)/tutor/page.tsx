import { createClient } from '@/lib/supabase/server'
import { CalendarDays, CheckCircle2, Users2, ClipboardList } from 'lucide-react'
import NoticeBanners from '@/components/tutor/NoticeBanner'
import MiniCalendar from '@/components/tutor/MiniCalendar'
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
    .select('id, legal_name, preferred_name, state')
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
  const tz = stateToTimezone(tutor.state)
  const displayName = tutor.preferred_name?.trim() || tutor.legal_name
  const firstName = displayName.split(' ')[0]

  const [
    { data: allNotices },
    { data: dismissals },
    { data: sessions },
    { data: pastSessions },
    { data: confirmedBookings },
  ] = await Promise.all([
    supabase
      .from('tutor_notices')
      .select('id, message, type')
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('tutor_notice_dismissals')
      .select('notice_id')
      .eq('tutor_id', tutor.id),
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
      .limit(40),
    supabase
      .from('sessions')
      .select('id, scheduled_at, bookings(students(name))')
      .lt('scheduled_at', now)
      .in('status', ['scheduled', 'completed'])
      .order('scheduled_at', { ascending: false })
      .limit(10),
    supabase
      .from('bookings')
      .select('id, students(id, name, year_level, subjects)')
      .eq('tutor_id', tutor.id)
      .eq('status', 'confirmed'),
  ])

  // Notices
  const dismissedIds = new Set((dismissals ?? []).map((d: any) => d.notice_id))
  const visibleNotices = (allNotices ?? []).filter(n => !dismissedIds.has(n.id)) as {
    id: string; message: string; type: 'info' | 'warning' | 'action'
  }[]

  // Reports due
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

  // Unique students from confirmed bookings
  const seenStudentIds = new Set<string>()
  const students = (confirmedBookings ?? [])
    .map((b: any) => b.students)
    .filter((s: any) => s && !seenStudentIds.has(s.id) && seenStudentIds.add(s.id))

  const upcomingSessions = sessions ?? []
  const nextSession = upcomingSessions[0]

  const calendarSessions = upcomingSessions.map(s => ({
    scheduled_at: s.scheduled_at,
    studentName: (s.bookings as any)?.students?.name ?? 'Student',
    durationMinutes: s.duration_minutes ?? 60,
    mode: (s.bookings as any)?.mode ?? 'online',
    location: (s.bookings as any)?.location ?? null,
  }))

  function dateLabel(dateStr: string) {
    if (isTodayInTz(dateStr, tz)) return 'Today'
    if (isTomorrowInTz(dateStr, tz)) return 'Tomorrow'
    return formatSessionDate(dateStr, tz)
  }

  return (
    <div className="max-w-5xl space-y-5">

      {/* Hero — always at the very top */}
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

      {/* Notices — below hero */}
      {visibleNotices.length > 0 && <NoticeBanners notices={visibleNotices} />}

      {/* Two-column grid: left content | calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5 min-w-0">

          {/* My Students + Reports Due — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* My Students */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm leading-tight">My students</h2>
                    <p className="text-[11px] text-muted-foreground">{students.length} active</p>
                  </div>
                </div>
                <a href="/tutor/students" className="text-xs text-primary font-medium hover:underline shrink-0">View all</a>
              </div>

              {students.length === 0 ? (
                <div className="px-5 pb-5 text-center">
                  <p className="text-sm text-muted-foreground">No students yet.</p>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-3">
                  {students.map((student: any) => (
                    <div key={student.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {student.name?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-sm font-medium flex-1 truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground text-right shrink-0 max-w-[90px] truncate">
                        {[student.year_level, student.subjects?.[0]].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reports Due */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  reportsdue.length > 0 ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <ClipboardList className={`w-4 h-4 ${reportsdue.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">Reports due</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {reportsdue.length > 0 ? `${reportsdue.length} pending` : 'All done'}
                  </p>
                </div>
              </div>

              {reportsdue.length === 0 ? (
                <div className="px-5 pb-5 flex flex-col items-center gap-1.5 text-center">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                  <p className="text-sm font-medium text-green-700">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No reports waiting.</p>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-3">
                  {reportsdue.map((s) => {
                    const student = (s.bookings as any)?.students
                    return (
                      <a
                        key={s.id}
                        href={`/tutor/reports/${s.id}`}
                        className="flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{student?.name ?? 'Student'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSessionDateShort(s.scheduled_at, tz)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-primary shrink-0 group-hover:underline">Write →</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-border">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">Upcoming sessions</h2>
                <p className="text-[11px] text-muted-foreground">
                  {upcomingSessions.length > 0 ? `${upcomingSessions.length} scheduled` : 'None scheduled'}
                </p>
              </div>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="font-medium mb-1">No upcoming sessions</p>
                <p className="text-sm text-muted-foreground">Sessions will appear here once booked.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingSessions.map((s) => {
                  const booking = s.bookings as any
                  const student = booking?.students
                  const isToday = isTodayInTz(s.scheduled_at, tz)
                  return (
                    <div key={s.id} className="flex items-stretch gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className={`w-1 rounded-full shrink-0 ${isToday ? 'bg-primary' : 'bg-primary/25'}`} />
                      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{dateLabel(s.scheduled_at)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(s.scheduled_at, tz)} · {s.duration_minutes ?? 60} min · {booking?.mode === 'online' ? 'Online' : booking?.location ?? '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{student?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {student?.year_level ?? ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right column — calendar */}
        <div className="lg:sticky lg:top-6">
          <MiniCalendar sessions={calendarSessions} tz={tz} />
        </div>

      </div>
    </div>
  )
}
