import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditTutorForm from './EditTutorForm'
import { format } from 'date-fns'

export default async function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tutor }, { data: bookings }] = await Promise.all([
    supabase
      .from('tutors')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('bookings')
      .select('id, status, mode, start_date, students(name, year_level), packages(type, sessions_total), parents(name)')
      .eq('tutor_id', id)
      .order('start_date', { ascending: false }),
  ])

  if (!tutor) notFound()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <a href="/admin/tutors" className="text-sm text-muted-foreground hover:text-primary">← Back to tutors</a>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{tutor.legal_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tutor.email}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge active={tutor.active} verified={tutor.verified} />
        </div>
      </div>

      <EditTutorForm tutor={tutor} />

      {/* Bookings */}
      {bookings && bookings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Bookings</h2>
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {bookings.map((b: any) => (
              <a key={b.id} href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-medium">{b.students?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.parents?.name} · {b.packages?.type} ({b.packages?.sessions_total} sessions) · {b.mode}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {b.start_date && (
                    <span className="text-xs text-muted-foreground">
                      From {format(new Date(b.start_date), 'd MMM yyyy')}
                    </span>
                  )}
                  <BookingStatusBadge status={b.status} />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatusBadge({ active, verified }: { active: boolean; verified: boolean }) {
  return (
    <div className="flex gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}>
        {active ? 'Active' : 'Inactive'}
      </span>
      {verified && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Verified
        </span>
      )}
    </div>
  )
}

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
