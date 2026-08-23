import { createClient } from '@/lib/supabase/server'
import { stateToTimezone } from '@/lib/timezone'
import StudentCard from './StudentCard'

export const dynamic = 'force-dynamic'

export default async function TutorStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, state')
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
  const tz = stateToTimezone(tutor?.state)

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-semibold">Students</h1>

      {!bookings.length ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center">
          <p className="font-medium mb-1">No students yet</p>
          <p className="text-sm text-muted-foreground">Your students will appear here once sessions are booked.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: any) => {
            const active = (sessionsByBooking[b.id] ?? []).filter(s => s.status !== 'cancelled')
            const upcoming = active.filter(s => new Date(s.scheduled_at) >= now)
              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            const past = active.filter(s => new Date(s.scheduled_at) < now)
              .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
            const pastNeedingReport = past.filter(s => !reportedSessionIds.has(s.id))
            const pastWithReport = past.filter(s => reportedSessionIds.has(s.id))

            return (
              <StudentCard
                key={b.id}
                booking={b}
                upcoming={upcoming}
                pastNeedingReport={pastNeedingReport}
                pastWithReport={pastWithReport}
                reportedSessionIds={reportedSessionIds}
                tz={tz}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
