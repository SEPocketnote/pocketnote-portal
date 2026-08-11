import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function formatLocation(suburb?: string | null, state?: string | null, postcode?: string | null) {
  const statePart = [state, postcode].filter(Boolean).join(' ')
  return [suburb, statePart].filter(Boolean).join(', ') || '—'
}

function WwccBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiry)
  const daysUntil = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">WWCC expired</span>
  }
  if (daysUntil <= 60) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">WWCC expiring</span>
  }
  return null
}

export default async function TutorsPage() {
  const supabase = await createClient()

  const { data: tutors } = await supabase
    .from('tutors')
    .select('id, legal_name, email, phone, subjects, location, state, postcode, active, verified, wwcc_expiry')
    .order('legal_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tutors</h1>
        <Link
          href="/admin/tutors/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          Add tutor
        </Link>
      </div>

      {!tutors?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No tutors yet</p>
          <p className="text-sm text-muted-foreground">Add your first tutor to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {tutors.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tutors/${t.id}`}
                className="flex items-start justify-between gap-3 bg-white rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.legal_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                  {(t.subjects?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.subjects?.slice(0, 3).join(', ')}{(t.subjects?.length ?? 0) > 3 ? '…' : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                  <WwccBadge expiry={(t as any).wwcc_expiry} />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subjects</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tutors.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tutors/${t.id}`} className="font-medium hover:text-primary">
                        {t.legal_name}
                      </Link>
                      <div className="text-muted-foreground text-xs">{t.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.subjects?.slice(0, 3).join(', ')}{(t.subjects?.length ?? 0) > 3 ? '…' : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatLocation(t.location, (t as any).state, (t as any).postcode)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                        <WwccBadge expiry={(t as any).wwcc_expiry} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
