import { createClient } from '@/lib/supabase/server'
import { format, isToday, isTomorrow, isFuture } from 'date-fns'

export default async function TutorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, legal_name')
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

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, status,
      bookings (
        mode, location,
        students ( name, year_level, subjects ),
        parents ( name, phone )
      )
    `)
    .eq('bookings.tutor_id', tutor.id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20)

  const upcomingSessions = sessions ?? []

  function dateLabel(dateStr: string) {
    const d = new Date(dateStr)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEEE d MMMM')
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">
        Hello, {tutor.legal_name.split(' ')[0]}
      </h1>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Upcoming sessions
        </h2>

        {!upcomingSessions.length ? (
          <div className="bg-white rounded-lg border border-border p-10 text-center">
            <p className="font-medium mb-1">No upcoming sessions</p>
            <p className="text-sm text-muted-foreground">Sessions will appear here once booked.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((s) => {
              const booking = s.bookings as any
              const student = booking?.students
              return (
                <div key={s.id} className="bg-white rounded-lg border border-border p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{dateLabel(s.scheduled_at)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(s.scheduled_at), 'h:mm a')}
                        {' · '}
                        {booking?.mode === 'online' ? 'Online' : booking?.location ?? '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{student?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {student?.year_level} · {student?.subjects?.join(', ')}
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
