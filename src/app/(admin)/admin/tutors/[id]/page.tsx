import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import StatusToggle from './StatusToggle'
import EditTutorForm from './EditTutorForm'
import DeleteAccountButton from '@/components/DeleteAccountButton'


export default async function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tutor }, { data: bookings }] = await Promise.all([
    supabase.from('tutors').select('*').eq('id', id).single(),
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

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {tutor.photo_url ? (
              <img src={tutor.photo_url} alt={tutor.legal_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg text-muted-foreground font-medium">
                {tutor.legal_name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{tutor.legal_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tutor.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            tutor.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {tutor.active ? 'Active' : 'Inactive'}
          </span>
          {tutor.verified && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Status controls */}
      <StatusToggle
        tutorId={id}
        active={tutor.active}
        verified={tutor.verified}
        hasAccount={!!tutor.user_id}
        name={tutor.legal_name}
        email={tutor.email}
      />

      <EditTutorForm
        tutorId={id}
        tutor={{
          legal_name: tutor.legal_name ?? '',
          email: tutor.email ?? '',
          phone: tutor.phone ?? '',
          location: tutor.location ?? '',
          state: tutor.state ?? '',
          postcode: tutor.postcode ?? '',
          address: tutor.address ?? '',
          abn: tutor.abn ?? '',
          wwcc_number: tutor.wwcc_number ?? '',
          wwcc_expiry: tutor.wwcc_expiry ?? '',
          date_of_birth: tutor.date_of_birth ?? '',
          bio: tutor.bio ?? '',
          subjects: tutor.subjects ?? [],
          year_levels: tutor.year_levels ?? [],
          credentials: tutor.credentials ?? [],
        }}
      />

      <DeleteAccountButton
        deleteUrl={`/api/admin/tutors/${id}`}
        redirectTo="/admin/tutors"
        name={tutor.legal_name}
      />

      {/* Bookings */}
      {bookings && bookings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Students</h2>
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
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>{b.status}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

