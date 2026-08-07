import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function ParentsPage() {
  const supabase = await createClient()

  const { data: parents } = await supabase
    .from('parents')
    .select(`
      id, name, email, phone, created_at,
      students ( id ),
      bookings ( id, status )
    `)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Parents</h1>
      </div>

      {!parents?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No parents yet</p>
          <p className="text-sm text-muted-foreground">Parents are created when you create an enrolment.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {parents.map((p: any) => {
              const activeEnrolments = (p.bookings ?? []).filter((b: any) => b.status === 'confirmed').length
              return (
                <Link
                  key={p.id}
                  href={`/admin/parents/${p.id}`}
                  className="flex items-start justify-between gap-3 bg-white rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
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
          <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active enrolments</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parents.map((p: any) => {
                  const activeEnrolments = (p.bookings ?? []).filter((b: any) => b.status === 'confirmed').length
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
        </>
      )}
    </div>
  )
}
