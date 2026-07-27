import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import MarkCompleteButton from './MarkCompleteButton'

export const dynamic = 'force-dynamic'

export default async function TutorStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const [bookingsResult, sessionsResult] = tutor
    ? await Promise.all([
        supabase
          .from('bookings')
          .select(`
            id, mode, location, sessions_count,
            packages ( type, sessions_total ),
            students ( name, year_level, subjects, notes ),
            parents ( name, phone, email )
          `)
          .eq('tutor_id', tutor.id)
          .eq('status', 'confirmed'),
        supabase
          .from('sessions')
          .select('id, scheduled_at, status, duration_minutes, booking_id')
          .order('scheduled_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  const bookings = bookingsResult.data ?? []
  const allSessions = sessionsResult.data ?? []

  // Group sessions by booking_id
  const sessionsByBooking: Record<string, typeof allSessions> = {}
  for (const s of allSessions) {
    if (!sessionsByBooking[s.booking_id]) sessionsByBooking[s.booking_id] = []
    sessionsByBooking[s.booking_id].push(s)
  }

  // Query progress_reports separately to avoid RLS interaction in join context
  const sessionIds = allSessions.map(s => s.id)
  const reportedSessionIds = new Set<string>()
  if (sessionIds.length) {
    const { data: reports } = await supabase
      .from('progress_reports')
      .select('session_id')
      .in('session_id', sessionIds)
    for (const r of reports ?? []) reportedSessionIds.add(r.session_id)
  }

  const now = new Date()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Students</h1>

      {!bookings.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No students yet</p>
          <p className="text-sm text-muted-foreground">Your students will appear here once sessions are booked.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: any) => {
            const student = b.students
            const parent = b.parents
            const pkg = b.packages
            const rawSessions = (sessionsByBooking[b.id] ?? []).filter(s => s.status !== 'cancelled')
            // Past sessions first (newest past first), then upcoming (nearest first)
            const pastS = rawSessions.filter(s => new Date(s.scheduled_at) < now)
            const upcomingS = rawSessions.filter(s => new Date(s.scheduled_at) >= now).reverse()
            const sessions = [...pastS, ...upcomingS]

            return (
              <div key={b.id} className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">{student?.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {student?.year_level}{student?.subjects?.length ? ` · ${student.subjects.join(', ')}` : ''}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rawSessions.filter((s: any) => s.status === 'completed').length}/{b.sessions_count ?? pkg?.sessions_total ?? 0} sessions
                  </span>
                </div>

                {student?.notes && (
                  <p className="text-sm bg-muted/50 rounded p-3 mb-4">{student.notes}</p>
                )}

                <div className="text-sm space-y-1 text-muted-foreground mb-5">
                  <p>Parent: <span className="text-foreground">{parent?.name}</span></p>
                  <p>Contact: <a href={`tel:${parent?.phone}`} className="text-primary">{parent?.phone}</a></p>
                  <p>Mode: <span className="text-foreground capitalize">{b.mode}{b.location ? ` · ${b.location}` : ''}</span></p>
                </div>

                {/* Session history — newest first */}
                {sessions.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sessions</p>
                    <div className="space-y-2">
                      {sessions.map(s => {
                        const isPast = new Date(s.scheduled_at) < now
                        const hasReport = reportedSessionIds.has(s.id)
                        return (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}
                              {' · '}{s.duration_minutes ?? 60} min
                            </span>
                            {!isPast ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Upcoming</span>
                            ) : s.status === 'scheduled' ? (
                              <MarkCompleteButton sessionId={s.id} />
                            ) : hasReport ? (
                              <a href={`/tutor/reports/${s.id}`}
                                className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 hover:bg-green-100">
                                ✓ Report
                              </a>
                            ) : (
                              <a href={`/tutor/reports/${s.id}`}
                                className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
                                Write report
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
