'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

type Tutor = {
  id: string
  legal_name: string
  email: string
  phone: string | null
  subjects: string[] | null
  location: string | null
  state: string | null
  postcode: string | null
  active: boolean
  verified: boolean
  wwcc_expiry: string | null
}

type StatusFilter = 'all' | 'active' | 'inactive'
type VerifiedFilter = 'all' | 'verified' | 'unverified'

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
  if (daysUntil < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">WWCC expired</span>
  if (daysUntil <= 60) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">WWCC expiring</span>
  return null
}

export default function TutorsSearch({ tutors }: { tutors: Tutor[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [verified, setVerified] = useState<VerifiedFilter>('all')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return tutors.filter(t => {
      if (status === 'active' && !t.active) return false
      if (status === 'inactive' && t.active) return false
      if (verified === 'verified' && !t.verified) return false
      if (verified === 'unverified' && t.verified) return false
      if (!q) return true
      return (
        t.legal_name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.subjects ?? []).some(s => s.toLowerCase().includes(q)) ||
        (t.location ?? '').toLowerCase().includes(q)
      )
    })
  }, [tutors, query, status, verified])

  return (
    <>
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email or subject…"
            className="input pl-9 text-sm w-64"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                status === f ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-muted/40'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {([['all', 'All'], ['verified', 'Verified'], ['unverified', 'Unverified']] as [VerifiedFilter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setVerified(f)}
              className={`px-3 py-1.5 transition-colors ${
                verified === f ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-muted/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-10 text-center text-sm text-muted-foreground">
          {query ? `No tutors match "${query}".` : 'No tutors match the selected filters.'}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tutors/${t.id}`}
                className="flex items-start justify-between gap-3 bg-white rounded-2xl shadow-md p-4 hover:bg-muted/20 transition-colors"
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
                  <WwccBadge expiry={t.wwcc_expiry} />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden overflow-x-auto">
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
                {filtered.map((t) => (
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
                      {formatLocation(t.location, t.state, t.postcode)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                        {!t.verified && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Unverified
                          </span>
                        )}
                        <WwccBadge expiry={t.wwcc_expiry} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(query || status !== 'all' || verified !== 'all') && (
            <p className="text-xs text-muted-foreground mt-3">
              {filtered.length} of {tutors.length} tutors
            </p>
          )}
        </>
      )}
    </>
  )
}
