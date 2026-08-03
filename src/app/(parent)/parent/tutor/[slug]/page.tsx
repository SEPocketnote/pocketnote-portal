import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MapPin, GraduationCap, BookOpen, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TutorPublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: tutor } = await admin
    .from('tutors')
    .select('id, legal_name, bio, photo_url, subjects, year_levels, location, state, credentials')
    .eq('slug', slug)
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

  const subjects = (tutor.subjects as string[] | null) ?? []
  const yearLevels = (tutor.year_levels as string[] | null) ?? []
  const credentials = (tutor.credentials as string[] | null) ?? []

  const locationLabel = [tutor.location, tutor.state].filter(Boolean).join(', ')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/parent" className="text-sm text-muted-foreground hover:text-primary">← Back</a>
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden mb-4">
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-muted flex items-center justify-center overflow-hidden shadow-sm">
              {tutor.photo_url ? (
                <img src={tutor.photo_url} alt={tutor.legal_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-muted-foreground">{initials}</span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">{tutor.legal_name}</h1>

          {locationLabel && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {locationLabel}
            </p>
          )}

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {subjects.slice(0, 5).map((s: string) => (
                <span key={s} className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {s}
                </span>
              ))}
              {subjects.length > 5 && (
                <span className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                  +{subjects.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <div className="bg-white rounded-xl border border-border p-6 mb-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <BookOpen className="w-3.5 h-3.5" /> About
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{tutor.bio}</p>
        </div>
      )}

      {/* Subjects */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6 mb-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Subjects
          </h2>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s: string) => (
              <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Year levels */}
      {yearLevels.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6 mb-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <Users className="w-3.5 h-3.5" /> Year levels
          </h2>
          <div className="flex flex-wrap gap-2">
            {yearLevels.map((y: string) => (
              <span key={y} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm">
                {y}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Credentials */}
      {credentials.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Qualifications
          </h2>
          <ul className="space-y-2">
            {credentials.map((c: string) => (
              <li key={c} className="flex items-start gap-2.5 text-sm">
                <span className="text-primary font-semibold mt-0.5 shrink-0">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
