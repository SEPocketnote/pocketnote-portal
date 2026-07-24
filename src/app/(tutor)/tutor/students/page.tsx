import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

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
            id, mode, location, sessions_completed,
            packages ( type, sessions_total ),
            students ( name, year_level, subjects, notes ),
            parents ( name, phone, email )
          `)
          .eq('tutor_id', tutor.id)
          .eq('status', 'confirmed'),
        supabase
          .from('sessions')
          .select('id, scheduled_at, status, booking_id, progress_reports(id, submitted_at)')
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
            const sessions = (sessionsByBooking[b.id] ?? [])
            const pastSessions = sessions.filter(s => new Date(s.scheduled_at) < now && s.status !== 'cancelled')
            const upcomingSessions = sessions.filter(s => new Date(s.scheduled_at) >= now && s.status === 'scheduled')

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
                    {b.sessions_completed}/{pkg?.sessions_total} sessions
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

                {/* Session history */}
                {(pastSessions.length > 0 || upcomingSessions.length > 0) && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sessions</p>
                    <div className="space-y-2">
                      {upcomingSessions.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Upcoming</span>
                        </div>
                      ))}
                      {pastSessions.map(s => {
                        const hasReport = (s.progress_reports as any[])?.length > 0
                        return (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}</span>
                            {hasReport ? (
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
