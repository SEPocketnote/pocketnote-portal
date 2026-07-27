import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function TutorPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: tutor } = await admin
    .from('tutors')
    .select('id, legal_name, bio, photo_url, subjects, year_levels, location, state, credentials')
    .eq('id', id)
    .eq('active', true)
    .eq('verified', true)
    .single()

  if (!tutor) notFound()

  const initials = tutor.legal_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/parent" className="text-sm text-muted-foreground hover:text-primary">← Back</a>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-4">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {tutor.photo_url ? (
              <img src={tutor.photo_url} alt={tutor.legal_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">{initials}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{tutor.legal_name}</h1>
            {(tutor.location || tutor.state) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[tutor.location, tutor.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {tutor.bio && (
          <p className="text-sm text-foreground/80 leading-relaxed mt-5">{tutor.bio}</p>
        )}
      </div>

      {/* Subjects */}
      {(tutor.subjects as string[] | null)?.length ? (
        <div className="bg-white rounded-xl border border-border p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {(tutor.subjects as string[]).map((s: string) => (
              <span key={s} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{s}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Year levels */}
      {(tutor.year_levels as string[] | null)?.length ? (
        <div className="bg-white rounded-xl border border-border p-5 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Year levels</h2>
          <div className="flex flex-wrap gap-2">
            {(tutor.year_levels as string[]).map((y: string) => (
              <span key={y} className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">{y}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Credentials */}
      {(tutor.credentials as string[] | null)?.length ? (
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Qualifications</h2>
          <ul className="space-y-1.5">
            {(tutor.credentials as string[]).map((c: string) => (
              <li key={c} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
