import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import EditParentForm from './EditParentForm'
import ResendParentInviteButton from '../../bookings/[id]/ResendParentInviteButton'
import StudentManager from '@/components/StudentManager'
import DeleteAccountButton from '@/components/DeleteAccountButton'

export const dynamic = 'force-dynamic'

export default async function ParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: parent }, { data: bookings }] = await Promise.all([
    admin.from('parents').select('*, students(id, name, year_level, subjects)').eq('id', id).single(),
    admin.from('bookings')
      .select('id, status, mode, start_date, students(name), packages(type, sessions_total), tutors(legal_name)')
      .eq('parent_id', id)
      .order('start_date', { ascending: false }),
  ])

  if (!parent) notFound()

  let authUser: any = null
  if (parent.user_id) {
    const { data } = await admin.auth.admin.getUserById(parent.user_id)
    authUser = data?.user ?? null
  }

  const hasAccount = !!parent.user_id
  const confirmed = !!authUser?.email_confirmed_at

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <a href="/admin/users" className="text-sm text-muted-foreground hover:text-primary">← Back to users</a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-lg text-muted-foreground font-medium">
              {parent.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{parent.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{parent.email}</p>
          </div>
        </div>
        <div>
          {!hasAccount ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No account</span>
          ) : !confirmed ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Invited</span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
          )}
        </div>
      </div>

      {/* Editable details */}
      <EditParentForm
        parentId={id}
        initialValues={{
          name: parent.name ?? '',
          email: parent.email ?? '',
          phone: parent.phone ?? '',
        }}
      />

      {/* Account info */}
      <section className="bg-white rounded-lg border border-border p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
          {hasAccount && (
            <ResendParentInviteButton parentId={id} name={parent.name} />
          )}
        </div>
        {hasAccount ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Last sign-in" value={authUser?.last_sign_in_at ? format(new Date(authUser.last_sign_in_at), 'd MMM yyyy') : 'Never'} />
            <Info label="Account created" value={authUser?.created_at ? format(new Date(authUser.created_at), 'd MMM yyyy') : '—'} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            This parent doesn&apos;t have a portal account yet. They&apos;ll receive an invite link when a booking is created.
          </p>
        )}
      </section>

      {/* Students */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Students
        </h2>
        <StudentManager
          students={(parent.students ?? []).map((s: any) => ({
            id: s.id,
            name: s.name,
            year_level: s.year_level ?? null,
            subjects: s.subjects ?? [],
          }))}
          createUrl={`/api/admin/parents/${id}/students`}
          updateUrlBase="/api/admin/students"
        />
      </section>

      {/* Bookings */}
      {bookings && bookings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Bookings ({bookings.length})
          </h2>
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {bookings.map((b: any) => (
              <a key={b.id} href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-medium">{b.students?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    with {b.tutors?.legal_name} · {b.packages?.type} ({b.packages?.sessions_total} sessions)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {b.start_date && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(b.start_date), 'd MMM yyyy')}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <DeleteAccountButton
        deleteUrl={`/api/admin/parents/${id}`}
        redirectTo="/admin/users"
        name={parent.name}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5 text-sm">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
