'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { BanButton } from './UserActions'

type UserRow = {
  id: string
  email: string
  name: string | null
  detailHref: string | null
  banned: boolean
  confirmed: boolean
  created_at: string | null
  last_sign_in_at: string | null
}

function StatusPill({ banned, confirmed }: { banned: boolean; confirmed: boolean }) {
  if (banned) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Banned</span>
  if (!confirmed) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Invited</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
}

function UserTable({ users, meId }: { users: UserRow[]; meId: string }) {
  if (!users.length) {
    return (
      <div className="bg-white rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        No results.
      </div>
    )
  }
  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {users.map(u => {
          const isSelf = u.id === meId
          return (
            <div key={u.id} className="bg-white rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  {u.detailHref ? (
                    <a href={u.detailHref} className="font-medium hover:text-primary hover:underline truncate block">
                      {u.name ?? '—'}
                    </a>
                  ) : (
                    <p className="font-medium truncate">{u.name ?? '—'}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {isSelf && <span className="text-[10px] text-primary font-medium">You</span>}
                </div>
                <StatusPill banned={u.banned} confirmed={u.confirmed} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Joined {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy') : '—'}
                </p>
                <BanButton userId={u.id} banned={u.banned} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name / Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Joined</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Last sign-in</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => {
              const isSelf = u.id === meId
              return (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {u.detailHref ? (
                      <a href={u.detailHref} className="font-medium hover:text-primary hover:underline">
                        {u.name ?? '—'}
                      </a>
                    ) : (
                      <p className="font-medium">{u.name ?? <span className="text-muted-foreground font-normal">—</span>}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {isSelf && <span className="text-[10px] text-primary font-medium">You</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill banned={u.banned} confirmed={u.confirmed} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'd MMM yyyy') : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BanButton userId={u.id} banned={u.banned} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function UsersSearch({
  tutorUsers,
  parentUsers,
  meId,
}: {
  tutorUsers: UserRow[]
  parentUsers: UserRow[]
  meId: string
}) {
  const [tutorQ, setTutorQ] = useState('')
  const [parentQ, setParentQ] = useState('')

  function filter(users: UserRow[], q: string) {
    if (!q.trim()) return users
    const lower = q.toLowerCase()
    return users.filter(u =>
      u.name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    )
  }

  const filteredTutors = filter(tutorUsers, tutorQ)
  const filteredParents = filter(parentUsers, parentQ)

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tutors ({tutorUsers.length})
          </h2>
          <input
            type="search"
            placeholder="Search tutors…"
            value={tutorQ}
            onChange={e => setTutorQ(e.target.value)}
            className="input w-48 text-sm py-1.5"
          />
        </div>
        <UserTable users={filteredTutors} meId={meId} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Parents ({parentUsers.length})
          </h2>
          <input
            type="search"
            placeholder="Search parents…"
            value={parentQ}
            onChange={e => setParentQ(e.target.value)}
            className="input w-48 text-sm py-1.5"
          />
        </div>
        <UserTable users={filteredParents} meId={meId} />
      </section>
    </>
  )
}
