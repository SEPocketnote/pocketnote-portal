import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format } from 'date-fns'
import { stateToTimezone, formatTime } from '@/lib/timezone'
import SessionRow from './SessionRow'
import BookingStatus from './BookingStatus'
import EnrolmentActions from './EnrolmentActions'

function scheduleLabel(booking: any) {
  const type = booking.schedule_type
  if (!type || type === 'single') return 'Single session'
  const freq = type === 'weekly' ? 'Weekly' : 'Fortnightly'
  if (booking.sessions_count) return `${freq} · ${booking.sessions_count} sessions`
  if (booking.recurrence_end_date) return `${freq} · until ${format(new Date(booking.recurrence_end_date), 'd MMM yyyy')}`
  return `${freq} · ongoing`
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: booking }, { data: sessions }, { data: tutors }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, mode, location, start_date, schedule_type, sessions_count, recurrence_end_date,
        parents ( id, name, email, phone ),
        students ( name, year_level, subjects ),
        tutors ( id, legal_name, email, state )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('sessions')
      .select('id, scheduled_at, status, duration_minutes')
      .eq('booking_id', id)
      .order('scheduled_at', { ascending: true }),
    admin.from('tutors').select('id, legal_name').eq('active', true).order('legal_name'),
  ])

  if (!booking) notFound()

  const parent = booking.parents as any
  const student = booking.students as any
  const tutor = booking.tutors as any
  const tutorTimezone = stateToTimezone(tutor?.state)

  const now = new Date().toISOString()
  const futureSessions = (sessions ?? []).filter(s => s.scheduled_at > now && s.status === 'scheduled')
  const firstFutureTime = futureSessions.length > 0
    ? formatTime(futureSessions[0].scheduled_at, tutorTimezone).replace(/\s*(AM|PM)/i, m => m.toLowerCase())
    : null

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href={parent?.id ? `/admin/parents/${parent.id}` : '/admin/parents'} className="text-sm text-muted-foreground hover:text-primary">
          ← {parent?.name ?? 'Parents'}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{student?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Link href={`/admin/parents/${parent?.id}`} className="hover:text-primary hover:underline">{parent?.name}</Link>
            {' · '}
            <Link href={`/admin/tutors/${tutor?.id}`} className="hover:text-primary hover:underline">{tutor?.legal_name}</Link>
          </p>
        </div>
        <BookingStatus bookingId={id} currentStatus={booking.status} />
      </div>

      {/* Summary */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolment details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Mode" value={booking.mode} />
          <Info label="Schedule" value={scheduleLabel(booking)} />
          <Info label="Start date" value={booking.start_date ? format(new Date(booking.start_date), 'd MMM yyyy') : null} />
          {booking.location && <Info label="Location" value={booking.location} />}
          <Info label="Student year" value={student?.year_level} />
          <Info label="Subjects" value={student?.subjects?.join(', ')} />
        </dl>
      </section>

      {/* Parent & tutor contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <section className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</h2>
            <Link href={`/admin/parents/${parent?.id}`} className="text-xs text-primary hover:underline">View profile →</Link>
          </div>
          <p className="text-sm font-medium">{parent?.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{parent?.email}</p>
          {parent?.phone && <p className="text-xs text-muted-foreground">{parent.phone}</p>}
        </section>
        <section className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutor</h2>
            <Link href={`/admin/tutors/${tutor?.id}`} className="text-xs text-primary hover:underline">View profile →</Link>
          </div>
          <p className="text-sm font-medium">{tutor?.legal_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tutor?.email}</p>
        </section>
      </div>

      {/* Enrolment actions */}
      <div className="mt-4">
        <EnrolmentActions
          bookingId={id}
          currentTutorId={tutor?.id ?? ''}
          tutors={(tutors ?? []) as { id: string; legal_name: string }[]}
          currentStatus={booking.status}
          futureSessionTime={firstFutureTime}
          timezone={tutorTimezone}
        />
      </div>

      {/* Sessions list */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Sessions ({sessions?.length ?? 0})
        </h2>
        {!sessions?.length ? (
          <div className="bg-white rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No sessions found.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {sessions.map((session, i) => (
              <SessionRow
                key={session.id}
                sessionId={session.id}
                index={i + 1}
                scheduledAt={session.scheduled_at}
                status={session.status}
                durationMinutes={session.duration_minutes ?? 60}
                timezone={tutorTimezone}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
