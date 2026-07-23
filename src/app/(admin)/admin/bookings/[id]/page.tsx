import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import SessionRow from './SessionRow'
import BookingStatus from './BookingStatus'
import ResendParentInviteButton from './ResendParentInviteButton'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: booking }, { data: sessions }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, mode, location, start_date, sessions_completed,
        parents ( id, name, email, phone ),
        students ( name, year_level, subjects ),
        tutors ( legal_name, email ),
        packages ( type, sessions_total )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('sessions')
      .select('id, scheduled_at, status')
      .eq('booking_id', id)
      .order('scheduled_at', { ascending: true }),
  ])

  if (!booking) notFound()

  const parent = booking.parents as any
  const student = booking.students as any
  const tutor = booking.tutors as any
  const pkg = booking.packages as any

  const completedCount = sessions?.filter(s => s.status === 'completed').length ?? 0

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <a href="/admin/bookings" className="text-sm text-muted-foreground hover:text-primary">← Back to bookings</a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{student?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {parent?.name} · {tutor?.legal_name}
          </p>
        </div>
        <BookingStatus bookingId={id} currentStatus={booking.status} />
      </div>

      {/* Summary */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Package" value={pkg?.type ? pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1) : null} />
          <Info label="Mode" value={booking.mode} />
          <Info label="Start date" value={booking.start_date ? format(new Date(booking.start_date), 'd MMM yyyy') : null} />
          <Info label="Location" value={booking.location} />
          <Info label="Student year" value={student?.year_level} />
          <Info label="Subjects" value={student?.subjects?.join(', ')} />
        </dl>

        {/* Progress bar */}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Sessions completed</span>
            <span>{completedCount} / {pkg?.sessions_total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${pkg?.sessions_total ? (completedCount / pkg.sessions_total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* Parent & tutor contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <section className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Parent</h2>
          <p className="text-sm font-medium">{parent?.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{parent?.email}</p>
          {parent?.phone && <p className="text-xs text-muted-foreground">{parent.phone}</p>}
          {parent?.id && (
            <ResendParentInviteButton parentId={parent.id} name={parent.name} />
          )}
        </section>
        <section className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tutor</h2>
          <p className="text-sm font-medium">{tutor?.legal_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tutor?.email}</p>
        </section>
      </div>

      {/* Sessions list */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Sessions
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
