import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import ResendInviteButton from './ResendInviteButton'
import StatusToggle from './StatusToggle'

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
        <div>
          <h1 className="text-2xl font-semibold">{tutor.legal_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tutor.email}</p>
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
      <StatusToggle tutorId={id} active={tutor.active} verified={tutor.verified} />

      {/* Profile info — filled in by tutor */}
      <section className="bg-white rounded-lg border border-border p-6 mt-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Phone" value={tutor.phone} />
          <Info label="Location" value={tutor.location} />
          <Info label="ABN" value={tutor.abn} />
          <Info label="WWCC number" value={tutor.wwcc_number} />
          <Info label="WWCC expiry" value={tutor.wwcc_expiry ? format(new Date(tutor.wwcc_expiry), 'd MMM yyyy') : null} />
          <Info label="Date of birth" value={tutor.date_of_birth ? format(new Date(tutor.date_of_birth), 'd MMM yyyy') : null} />
          <Info label="Address" value={tutor.address} />
        </dl>
        {tutor.bio && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
            <p className="text-sm">{tutor.bio}</p>
          </div>
        )}
        {(tutor.subjects?.length > 0 || tutor.year_levels?.length > 0) && (
          <div className="pt-2 border-t border-border flex flex-wrap gap-4">
            {tutor.subjects?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {tutor.subjects.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-secondary text-primary rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {tutor.year_levels?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Year levels</p>
                <div className="flex flex-wrap gap-1.5">
                  {tutor.year_levels.map((y: string) => (
                    <span key={y} className="px-2 py-0.5 bg-secondary text-primary rounded-full text-xs">{y}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!tutor.bio && !tutor.abn && !tutor.phone && (
          <p className="text-sm text-muted-foreground italic">
            Tutor hasn't completed their profile yet.
          </p>
        )}
      </section>

      {/* Invite */}
      <section className="bg-white rounded-lg border border-border p-4 mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Portal access</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tutor.user_id ? 'Tutor has a portal account' : 'No portal account yet'}
          </p>
        </div>
        <ResendInviteButton tutorId={id} name={tutor.legal_name} email={tutor.email} />
      </section>

      {/* Bookings */}
      {bookings && bookings.length > 0 && (
        <section className="mt-6">
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

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
