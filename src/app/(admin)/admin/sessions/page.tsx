import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
}

type Filter = 'upcoming' | 'past' | 'all'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; tutor?: string }>
}) {
  const { filter: filterParam, tutor: tutorParam } = await searchParams
  const filter: Filter = (filterParam as Filter) ?? 'upcoming'

  const supabase = await createClient()

  const now = new Date().toISOString()

  let query = supabase
    .from('sessions')
    .select(`
      id, scheduled_at, status, duration_minutes,
      bookings!inner(
        id, mode,
        parents ( id, name ),
        students ( name ),
        tutors ( id, legal_name, state )
      )
    `)
    .order('scheduled_at', { ascending: filter !== 'past' })
    .limit(200)

  if (filter === 'upcoming') query = query.gte('scheduled_at', now).neq('status', 'cancelled')
  if (filter === 'past') query = query.lt('scheduled_at', now)

  const { data: sessions } = await query

  const { data: tutors } = await supabase
    .from('tutors')
    .select('id, legal_name')
    .eq('active', true)
    .order('legal_name')

  const filtered = tutorParam
    ? (sessions ?? []).filter((s: any) => s.bookings?.tutors?.id === tutorParam)
    : (sessions ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Link
          href="/admin/bookings/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          New enrolment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['upcoming', 'past', 'all'] as Filter[]).map(f => (
            <Link
              key={f}
              href={`/admin/sessions?filter=${f}${tutorParam ? `&tutor=${tutorParam}` : ''}`}
              className={`px-4 py-2 capitalize transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-muted/40'
              }`}
            >
              {f}
            </Link>
          ))}
        </div>

        {tutors && tutors.length > 0 && (
          <form method="GET" action="/admin/sessions" className="flex items-center gap-2">
            <input type="hidden" name="filter" value={filter} />
            <select name="tutor" defaultValue={tutorParam ?? ''} className="input text-sm py-2">
              <option value="">All tutors</option>
              {tutors.map((t: any) => (
                <option key={t.id} value={t.id}>{t.legal_name}</option>
              ))}
            </select>
            <button type="submit" className="btn text-sm px-3 py-2">Filter</button>
          </form>
        )}
      </div>

      {!filtered.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          No sessions found.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((s: any) => {
              const tz = stateToTimezone(s.bookings?.tutors?.state)
              return (
                <Link
                  key={s.id}
                  href={`/admin/bookings/${s.bookings?.id}`}
                  className="flex items-start justify-between gap-3 bg-white rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.bookings?.students?.name}</p>
                    <p className="text-xs text-muted-foreground">{s.bookings?.parents?.name} · {s.bookings?.tutors?.legal_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes} min
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[s.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {s.status}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date & time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s: any) => {
                  const tz = stateToTimezone(s.bookings?.tutors?.state)
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatSessionDateFullYear(s.scheduled_at, tz)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(s.scheduled_at, tz)}</p>
                      </td>
                      <td className="px-4 py-3">{s.bookings?.students?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/parents/${s.bookings?.parents?.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {s.bookings?.parents?.name ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/tutors/${s.bookings?.tutors?.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {s.bookings?.tutors?.legal_name ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.duration_minutes} min</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {s.status}
                        </span>
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
