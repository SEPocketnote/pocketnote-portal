import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { tutorDisplayName } from '@/lib/tutor-display'
import SessionsTable from './SessionsTable'

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
      progress_reports ( covered, went_well, needs_work, next_session_plan, notes ),
      bookings!inner(
        id, mode,
        parents ( id, name ),
        students ( name ),
        tutors ( id, legal_name, preferred_name, state )
      )
    `)
    .order('scheduled_at', { ascending: filter !== 'past' })
    .limit(200)

  if (filter === 'upcoming') query = query.gte('scheduled_at', now).neq('status', 'cancelled')
  if (filter === 'past') query = query.lt('scheduled_at', now)

  const { data: sessions } = await query

  const { data: tutors } = await supabase
    .from('tutors')
    .select('id, legal_name, preferred_name')
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
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-[#F5F4F2]'
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
                <option key={t.id} value={t.id}>{tutorDisplayName(t)}</option>
              ))}
            </select>
            <button type="submit" className="btn text-sm px-3 py-2">Filter</button>
          </form>
        )}
      </div>

      {!filtered.length ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center text-sm text-muted-foreground">
          No sessions found.
        </div>
      ) : (
        <SessionsTable sessions={filtered as any} />
      )}
    </div>
  )
}
