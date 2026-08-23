'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Search } from 'lucide-react'

type Parent = {
  id: string
  name: string
  email: string
  phone: string | null
  created_at: string | null
  students: { id: string }[] | null
  bookings: { id: string; status: string }[] | null
}

export default function ParentsSearch({ parents }: { parents: Parent[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return parents
    return parents.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    )
  }, [parents, query])

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          className="input pl-9 text-sm w-full max-w-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center text-sm text-muted-foreground">
          No parents match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((p) => {
              const activeEnrolments = (p.bookings ?? []).filter(b => b.status === 'confirmed').length
              return (
                <Link
                  key={p.id}
                  href={`/admin/parents/${p.id}`}
                  className="flex items-start justify-between gap-3 bg-white rounded-2xl shadow-card p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{p.students?.length ?? 0} student{p.students?.length !== 1 ? 's' : ''}</p>
                    {activeEnrolments > 0 && (
                      <p className="text-xs text-green-600 font-medium">{activeEnrolments} active</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[#F5F4F2]">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active enrolments</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const activeEnrolments = (p.bookings ?? []).filter(b => b.status === 'confirmed').length
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/parents/${p.id}`} className="font-medium hover:text-primary hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone || '—'}</td>
                      <td className="px-4 py-3">{p.students?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        {activeEnrolments > 0
                          ? <span className="text-green-600 font-medium">{activeEnrolments}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.created_at ? format(new Date(p.created_at), 'd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {query && (
            <p className="text-xs text-muted-foreground mt-3">
              {filtered.length} of {parents.length} parents
            </p>
          )}
        </>
      )}
    </>
  )
}
