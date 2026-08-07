import { createClient } from '@/lib/supabase/server'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
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
  const tz = stateToTimezone(tutor.state)
  const firstName = tutor.legal_name.split(' ')[0]

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

  // Unique students
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

      {/* Hero — full width, always at top */}
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

      {/* Notices — below hero, full width */}
      {visibleNotices.length > 0 && <NoticeBanners notices={visibleNotices} />}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5 min-w-0">

          {/* My students */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">My students</h2>
              <a href="/tutor/students" className="text-xs text-primary hover:underline font-medium">View all</a>
            </div>
            {students.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No students yet — sessions will appear here once booked.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {students.map((student: any) => (
                  <div key={student.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {student.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.year_level}
                        {student.subjects?.length ? ` · ${student.subjects.slice(0, 2).join(', ')}${student.subjects.length > 2 ? '…' : ''}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reports due */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">Reports due</h2>
            </div>
            {reportsdue.length === 0 ? (
              <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <p className="text-sm font-medium text-green-700">All caught up!</p>
                <p className="text-xs text-muted-foreground">No reports waiting to be written.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reportsdue.map((s) => {
                  const student = (s.bookings as any)?.students
                  return (
                    <a
                      key={s.id}
                      href={`/tutor/reports/${s.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{student?.name ?? 'Student'}</p>
                        <p className="text-xs text-muted-foreground">
                          Session on {formatSessionDateShort(s.scheduled_at, tz)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-primary shrink-0 ml-3">Write report →</span>
                    </a>
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
