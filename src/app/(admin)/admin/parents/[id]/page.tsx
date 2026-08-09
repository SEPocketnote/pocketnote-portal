import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import EditParentForm from './EditParentForm'
import ResendParentInviteButton from '../../bookings/[id]/ResendParentInviteButton'
import StudentManager from '@/components/StudentManager'
import DeleteAccountButton from '@/components/DeleteAccountButton'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700',
}

const SESSION_STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
}

function scheduleLabel(booking: any) {
  const type = booking.schedule_type
  if (!type || type === 'single') return 'Single session'
  const freq = type === 'weekly' ? 'Weekly' : 'Fortnightly'
  if (booking.sessions_count) return `${freq} · ${booking.sessions_count} sessions`
  if (booking.recurrence_end_date) return `${freq} · until ${format(new Date(booking.recurrence_end_date), 'd MMM yyyy')}`
  return `${freq} · ongoing`
}

export default async function ParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const now = new Date().toISOString()

  const [{ data: parent }, { data: bookings }, { data: upcomingSessions }] = await Promise.all([
    admin.from('parents').select('*, students(id, name, year_level, subjects)').eq('id', id).single(),
    admin.from('bookings')
      .select(`
        id, status, mode, schedule_type, sessions_count, recurrence_end_date, start_date,
        students ( name ),
        tutors ( id, legal_name, state )
      `)
      .eq('parent_id', id)
      .order('created_at', { ascending: false }),
    admin.from('sessions')
      .select(`
        id, scheduled_at, status, duration_minutes,
        bookings!inner( id, students(name), tutors(legal_name, state) )
      `)
      .eq('bookings.parent_id', id)
      .gte('scheduled_at', now)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ])

  if (!parent) notFound()

  let authUser: any = null
  if (parent.user_id) {
    const { data } = await admin.auth.admin.getUserById(parent.user_id)
    authUser = data?.user ?? null
  }

  const hasAccount = !!parent.user_id
  const confirmed = !!authUser?.email_confirmed_at

  const activeBookings = (bookings ?? []).filter((b: any) => b.status === 'confirmed')
  const pastBookings = (bookings ?? []).filter((b: any) => b.status !== 'confirmed')

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/parents" className="text-sm text-muted-foreground hover:text-primary">← Parents</Link>
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
          <ResendParentInviteButton parentId={id} name={parent.name} hasAccount={hasAccount} />
        </div>
        {hasAccount ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Last sign-in" value={authUser?.last_sign_in_at ? format(new Date(authUser.last_sign_in_at), 'd MMM yyyy') : 'Never'} />
            <Info label="Account created" value={authUser?.created_at ? format(new Date(authUser.created_at), 'd MMM yyyy') : '—'} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No portal access. Click <strong>Send invite</strong> to create an account and send them a login link.
          </p>
        )}
      </section>

      {/* Students */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Students</h2>
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

      {/* Upcoming sessions */}
      {(upcomingSessions ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Upcoming sessions
          </h2>
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {(upcomingSessions ?? []).map((s: any) => {
              const tz = stateToTimezone(s.bookings?.tutors?.state)
              return (
                <Link
                  key={s.id}
                  href={`/admin/bookings/${s.bookings?.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{s.bookings?.students?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes} min
                    </p>
                    <p className="text-xs text-muted-foreground">{s.bookings?.tutors?.legal_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${SESSION_STATUS_STYLES[s.status] ?? ''}`}>
                    {s.status}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Active enrolments */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active enrolments</h2>
          <Link href={`/admin/bookings/new?parentId=${parent.id}`} className="text-xs text-primary hover:underline font-medium">
            + Add enrolment
          </Link>
        </div>
        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No active enrolments.{' '}
            <Link href={`/admin/bookings/new?parentId=${parent.id}`} className="text-primary hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {activeBookings.map((b: any) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{(b.students as any)?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(b.tutors as any)?.legal_name} · {b.mode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{scheduleLabel(b)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 mt-0.5 ${STATUS_STYLES[b.status] ?? ''}`}>
                  {b.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Past enrolments */}
      {pastBookings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Past enrolments</h2>
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {pastBookings.map((b: any) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{(b.students as any)?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(b.tutors as any)?.legal_name} · {b.mode}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[b.status] ?? ''}`}>
                  {b.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <DeleteAccountButton
        deleteUrl={`/api/admin/parents/${id}`}
        redirectTo="/admin/parents"
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
