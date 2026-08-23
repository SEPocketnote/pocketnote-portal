import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFuture } from 'date-fns'
import { CalendarDays, BookOpen, UserCircle } from 'lucide-react'
import MiniCalendar from '@/components/tutor/MiniCalendar'
import { stateToTimezone, formatSessionDate, formatSessionDateShortTime, formatTime, isTodayInTz } from '@/lib/timezone'
import SessionChangeForm from './SessionChangeForm'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, state, timezone')
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

  const { data: pendingRequests } = await supabase
    .from('session_change_requests')
    .select('session_id')
    .eq('parent_id', parent.id)
    .eq('status', 'pending')

  const pendingSessionIds = new Set((pendingRequests ?? []).map((r: any) => r.session_id))

  const tutorIds = [...new Set((bookings ?? []).map((b: any) => b.tutor_id).filter(Boolean))]
  const admin = createAdminClient()
  const { data: tutorRows } = tutorIds.length
    ? await admin.from('tutors').select('id, slug, legal_name, preferred_name, bio, photo_url, subjects, location, state').in('id', tutorIds)
    : { data: [] }
  const tutorMap: Record<string, any> = {}
  for (const t of tutorRows ?? []) tutorMap[t.id] = t
  const tutorNames: Record<string, string> = {}
  for (const t of tutorRows ?? []) tutorNames[t.id] = t.preferred_name?.trim() || t.legal_name

  const upcomingSessions = bookings?.flatMap((b) =>
    (b.sessions as any[])
      .filter((s) => s.status === 'scheduled' && isFuture(new Date(s.scheduled_at)))
      .map((s) => ({ ...s, booking: b }))
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ?? []

  const pastSessions = bookings?.flatMap((b) =>
    (b.sessions as any[])
      .filter((s) => !isFuture(new Date(s.scheduled_at)) && s.status !== 'cancelled')
      .map((s) => ({ ...s, booking: b }))
  ).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
  .slice(0, 5) ?? []

  const nextSession = upcomingSessions[0]
  const firstName = parent.name.split(' ')[0]
  // Use parent's own timezone; fall back to tutor's state timezone for backwards compat
  const nextTz = (parent as any).timezone
    ?? (nextSession ? stateToTimezone(tutorMap[(nextSession.booking as any).tutor_id]?.state) : 'Australia/Sydney')

  const parentTz = (parent as any).timezone
    ?? ((tutorRows ?? []).length > 0 ? stateToTimezone((tutorRows ?? [])[0].state) : 'Australia/Sydney')
  const calendarTz = parentTz
  const calendarSessions = upcomingSessions.map(s => ({
    scheduled_at: s.scheduled_at,
    studentName: (s.booking.students as any)?.name ?? 'Student',
    durationMinutes: s.duration_minutes ?? 60,
    mode: s.booking.mode,
    location: (s.booking as any).location ?? null,
  }))

  function bookingTypeLabel(b: any): string {
    const pkg = b.packages as any
    const scheduleType = b.schedule_type as string
    const isCasual = scheduleType === 'single' || (!scheduleType && !pkg)
    if (b.packages) return `${pkg?.type ? pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1) : 'Package'}`
    if (isCasual) return 'Casual'
    return scheduleType === 'weekly' ? 'Weekly' : 'Fortnightly'
  }

  return (
    <div className="max-w-5xl space-y-5">

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

      {/* Two-column grid: left content | calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5 min-w-0">

          {/* My Bookings + My Tutors — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* My Bookings */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">My bookings</h2>
                  <p className="text-[11px] text-muted-foreground">{bookings?.length ?? 0} active</p>
                </div>
              </div>

              {!bookings?.length ? (
                <div className="px-5 pb-5 text-center">
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-3">
                  {bookings.map((b) => {
                    const student = b.students as any
                    const pkg = b.packages as any
                    const sessions = b.sessions as any[]
                    const completed = sessions.filter(s => s.status === 'completed').length
                    const total = (b as any).sessions_count ?? pkg?.sessions_total ?? 0
                    const showProgress = total > 0

                    return (
                      <div key={b.id} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {student?.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tutorNames[(b as any).tutor_id] ?? 'Tutor TBC'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {showProgress ? `${completed}/${total}` : bookingTypeLabel(b)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* My Tutors */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">
                    {(tutorRows ?? []).length === 1 ? 'My tutor' : 'My tutors'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">{(tutorRows ?? []).length} assigned</p>
                </div>
              </div>

              {!(tutorRows ?? []).length ? (
                <div className="px-5 pb-5 text-center">
                  <p className="text-sm text-muted-foreground">No tutor assigned yet.</p>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-3">
                  {(tutorRows ?? []).map((t: any) => (
                    <a key={t.id} href={`/profile/${t.slug ?? t.id}`} className="flex items-center gap-2.5 group">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                        {t.photo_url
                          ? <img src={t.photo_url} alt={t.preferred_name?.trim() || t.legal_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{(t.preferred_name?.trim() || t.legal_name)?.[0]?.toUpperCase()}</div>
                        }
                      </div>
                      <p className="text-sm font-medium flex-1 truncate group-hover:text-primary transition-colors">{t.preferred_name?.trim() || t.legal_name}</p>
                      <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[80px]">
                        {t.location ?? t.state ?? ''}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
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
                <p className="text-sm text-muted-foreground">
                  We&apos;re finding the right tutor for you. We&apos;ll be in touch soon.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingSessions.map((s) => {
                  const tz = (parent as any).timezone
                    ?? stateToTimezone(tutorMap[(s.booking as any).tutor_id]?.state)
                  const sessionLabel = formatSessionDateShortTime(s.scheduled_at, tz)
                  const isToday = isTodayInTz(s.scheduled_at, tz)
                  return (
                    <div key={s.id} className="flex items-stretch gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className={`w-1 rounded-full shrink-0 ${isToday ? 'bg-primary' : 'bg-primary/25'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            <p className="text-sm font-semibold">{sessionLabel}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {s.booking.mode === 'online' ? 'Online' : s.booking.location}
                              {' · '}{s.duration_minutes ?? 60} min
                              {' · '}{(s.booking.students as any)?.name}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0">
                            {tutorNames[(s.booking as any).tutor_id] ?? 'TBC'}
                          </p>
                        </div>
                        <SessionChangeForm
                          sessionId={s.id}
                          bookingId={(s.booking as any).id}
                          sessionLabel={sessionLabel}
                          hasPendingRequest={pendingSessionIds.has(s.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">Past sessions</h2>
                  <p className="text-[11px] text-muted-foreground">Last {pastSessions.length}</p>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {pastSessions.map((s) => {
                  const tz = (parent as any).timezone
                    ?? stateToTimezone(tutorMap[(s.booking as any).tutor_id]?.state)
                  return (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{formatSessionDateShortTime(s.scheduled_at, tz)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(s.booking.students as any)?.name}
                          {' · '}{tutorNames[(s.booking as any).tutor_id] ?? 'TBC'}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right column — calendar */}
        <div className="lg:sticky lg:top-6">
          <MiniCalendar sessions={calendarSessions} tz={calendarTz} />
        </div>

      </div>
    </div>
  )
}
