import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import AddAdminForm from './AddAdminForm'
import { RemoveAdminButton, BanButton, ResendAdminInviteButton } from './UserActions'
import UsersSearch from './UsersSearch'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const [
    { data: authData },
    { data: profiles },
    { data: tutors },
    { data: parents },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('id, role'),
    admin.from('tutors').select('id, user_id, legal_name, email'),
    admin.from('parents').select('id, user_id, name, email'),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.role as string]))
  const tutorMap = new Map((tutors ?? []).filter(t => t.user_id).map(t => [t.user_id!, { name: t.legal_name, dbId: t.id }]))
  const parentMap = new Map((parents ?? []).filter(p => p.user_id).map(p => [p.user_id!, { name: p.name, dbId: p.id }]))

  const users = (authData?.users ?? []).map(u => {
    const role = profileMap.get(u.id) ?? 'unknown'
    const tutorData = tutorMap.get(u.id)
    const parentData = parentMap.get(u.id)
    const name =
      role === 'tutor' ? (tutorData?.name ?? null) :
      role === 'parent' ? (parentData?.name ?? null) :
      null
    const detailHref =
      role === 'tutor' && tutorData ? `/admin/tutors/${tutorData.dbId}` :
      role === 'parent' && parentData ? `/admin/parents/${parentData.dbId}` :
      null
    const banned = u.banned_until ? new Date(u.banned_until) > new Date() : false
    const confirmed = !!u.email_confirmed_at
    return { ...u, email: u.email ?? '', last_sign_in_at: u.last_sign_in_at ?? null, role, name, detailHref, banned, confirmed }
  })

  const adminUsers = users.filter(u => u.role === 'admin')
  const tutorUsers = users.filter(u => u.role === 'tutor')
  const parentUsers = users.filter(u => u.role === 'parent')
  const otherUsers = users.filter(u => !['admin', 'tutor', 'parent'].includes(u.role))

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold">Users & Access</h1>

      {/* Admins */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Admins ({adminUsers.length})
          </h2>
          <AddAdminForm />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-xs text-amber-800 mb-3">
          <strong>Note:</strong> After inviting a new admin, also add their email to the{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">ADMIN_EMAILS</code> environment variable so they can
          sign in after the initial invite link expires.
        </div>

        <UserTable users={adminUsers} meId={me?.id ?? ''} showAdminActions />
      </section>

      <UsersSearch
        tutorUsers={tutorUsers}
        parentUsers={parentUsers}
        meId={me?.id ?? ''}
      />

      {/* Others (invited but not confirmed, or no profile yet) */}
      {otherUsers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Pending / Unknown ({otherUsers.length})
          </h2>
          <UserTable users={otherUsers} meId={me?.id ?? ''} />
        </section>
      )}
    </div>
  )
}

function StatusPill({ banned, confirmed }: { banned: boolean; confirmed: boolean }) {
  if (banned) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Banned</span>
  if (!confirmed) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Invited</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
}

function UserTable({ users, meId, showAdminActions }: {
  users: any[]; meId: string; showAdminActions?: boolean
}) {
  if (!users.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 text-center text-sm text-muted-foreground">
        None yet.
      </div>
    )
  }
  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {users.map((u: any) => {
          const isSelf = u.id === meId
          return (
            <div key={u.id} className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name ?? u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {isSelf && <span className="text-[10px] text-primary font-medium">You</span>}
                </div>
                <StatusPill banned={u.banned} confirmed={u.confirmed} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Joined {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy') : '—'}
                </p>
                <div className="flex items-center gap-3">
                  {showAdminActions && !u.confirmed && <ResendAdminInviteButton userId={u.id} />}
                  {showAdminActions && <RemoveAdminButton userId={u.id} isSelf={isSelf} />}
                  <BanButton userId={u.id} banned={u.banned} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden overflow-x-auto">
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
            {users.map((u: any) => {
              const isSelf = u.id === meId
              return (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name ?? u.email}</p>
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
                    <div className="flex items-center justify-end gap-3">
                      {showAdminActions && !u.confirmed && <ResendAdminInviteButton userId={u.id} />}
                      {showAdminActions && <RemoveAdminButton userId={u.id} isSelf={isSelf} />}
                      <BanButton userId={u.id} banned={u.banned} />
                    </div>
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

