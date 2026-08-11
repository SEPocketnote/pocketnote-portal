import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import StatusToggle from './StatusToggle'
import EditTutorForm from './EditTutorForm'
import StudentRateOverrides from './StudentRateOverrides'
import DeleteAccountButton from '@/components/DeleteAccountButton'
import ViewDocumentButton from './ViewDocumentButton'


export default async function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: tutor }, { data: bookings }, { data: rateTiers }, { data: rateOverrides }] = await Promise.all([
    supabase.from('tutors').select('*').eq('id', id).single(),
    supabase
      .from('bookings')
      .select('id, status, mode, start_date, students(id, name, year_level), packages(type, sessions_total), parents(name)')
      .eq('tutor_id', id)
      .order('start_date', { ascending: false }),
    admin.from('rate_tiers').select('id, name, online_rate_cents, inperson_rate_cents').order('sort_order', { ascending: true }),
    admin.from('student_rate_overrides').select('id, student_id, rate_cents, students(name)').eq('tutor_id', id),
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
        <div className="flex gap-2 flex-wrap justify-end items-center">
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
          {tutor.slug && (
            <a
              href={`/profile/${tutor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/40 hover:text-primary transition-colors"
            >
              Public profile ↗
            </a>
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
          rate_tier_id: tutor.rate_tier_id ?? null,
          online_rate_override_cents: tutor.online_rate_override_cents ?? null,
          inperson_rate_override_cents: tutor.inperson_rate_override_cents ?? null,
          mode: tutor.mode ?? 'either',
        }}
        rateTiers={rateTiers ?? []}
      />

      {/* Student rate overrides */}
      {(() => {
        // Unique students from bookings
        const seen = new Set<string>()
        const students = (bookings ?? [])
          .map((b: any) => b.students)
          .filter((s: any) => s && !seen.has(s.id) && seen.add(s.id))
          .map((s: any) => ({ id: s.id, name: s.name }))

        const overridesList = (rateOverrides ?? []).map((o: any) => ({
          id: o.id,
          student_id: o.student_id,
          student_name: o.students?.name ?? 'Unknown',
          rate_cents: o.rate_cents,
        }))

        return (
          <StudentRateOverrides
            tutorId={id}
            overrides={overridesList}
            students={students}
          />
        )
      })()}

      {/* Bank details */}
      {(() => {
        const bd = tutor.bank_details as { account_name?: string; bsb?: string; account_number?: string } | null
        return (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Payment details</h2>
            {bd?.account_name || bd?.bsb || bd?.account_number ? (
              <div className="bg-white rounded-lg border border-border px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Account name</p>
                  <p className="font-medium">{bd.account_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">BSB</p>
                  <p className="font-medium">{bd.bsb || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Account number</p>
                  <p className="font-medium">{bd.account_number || '—'}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-700">
                No bank details on file — tutor has not added payment information yet.
              </div>
            )}
          </section>
        )
      })()}

      {/* Compliance documents */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Compliance documents</h2>
        <div className="bg-white rounded-lg border border-border px-5 py-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Driver&apos;s licence</span>
            {tutor.licence_url ? (
              <ViewDocumentButton tutorId={id} type="licence" label="View ↗" />
            ) : (
              <span className="text-xs text-muted-foreground italic">Not uploaded</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">WWCC card</span>
            {tutor.wwcc_url ? (
              <ViewDocumentButton tutorId={id} type="wwcc" label="View ↗" />
            ) : (
              <span className="text-xs text-muted-foreground italic">Not uploaded</span>
            )}
          </div>
        </div>
      </section>

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

      <DeleteAccountButton
        deleteUrl={`/api/admin/tutors/${id}`}
        redirectTo="/admin/tutors"
        name={tutor.legal_name}
      />
    </div>
  )
}

