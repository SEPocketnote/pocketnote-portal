import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stateToTimezone, formatSessionDateFullYear } from '@/lib/timezone'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('id, timezone')
    .eq('user_id', user!.id)
    .single()

  const now = new Date().toISOString()

  const { data: sessions } = parent
    ? await supabase
        .from('sessions')
        .select(`
          id, scheduled_at, status,
          progress_reports ( id, covered, went_well, needs_work, next_session_plan, notes, internal_rating, submitted_at ),
          bookings!inner (
            students ( name ),
            tutors ( legal_name, preferred_name, state )
          )
        `)
        .lt('scheduled_at', now)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const rows = (sessions ?? []).map((s: any) => ({
    session: s,
    report: Array.isArray(s.progress_reports) ? s.progress_reports[0] ?? null : s.progress_reports ?? null,
    booking: s.bookings,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Progress Reports</h1>

      {!rows.length ? (
        <div className="bg-white rounded-2xl shadow-card p-10 text-center">
          <p className="font-medium mb-1">No sessions yet</p>
          <p className="text-sm text-muted-foreground">
            Reports will appear here after each session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ session, report, booking }) => {
            const tz = (parent as any)?.timezone ?? stateToTimezone(booking?.tutors?.state)
            const tutorName = booking?.tutors?.preferred_name?.trim() || booking?.tutors?.legal_name
            return (
              <div key={session.id} className="bg-white rounded-2xl shadow-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold">{booking?.students?.name ?? 'Student'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatSessionDateFullYear(session.scheduled_at, tz)}
                      {tutorName ? ` · with ${tutorName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {report
                      ? report.internal_rating
                        ? <RatingPill rating={report.internal_rating} />
                        : null
                      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Waiting on tutor</span>
                    }
                  </div>
                </div>

                {report ? (
                  <div className="space-y-3 text-sm">
                    {report.covered && <ReportRow label="What we covered" value={report.covered} />}
                    {report.went_well && <ReportRow label="What went well" value={report.went_well} />}
                    {report.needs_work && <ReportRow label="Areas to work on" value={report.needs_work} />}
                    {report.next_session_plan && <ReportRow label="Plan for next session" value={report.next_session_plan} />}
                    {report.notes && <ReportRow label="Additional notes" value={report.notes} />}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Your tutor hasn&apos;t submitted a report for this session yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-0.5">{label}</p>
      <p>{value}</p>
    </div>
  )
}

const RATING_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Struggling',     className: 'bg-red-100 text-red-700' },
  2: { label: 'Below average',  className: 'bg-orange-100 text-orange-700' },
  3: { label: 'On track',       className: 'bg-blue-100 text-blue-700' },
  4: { label: 'Good progress',  className: 'bg-emerald-100 text-emerald-700' },
  5: { label: 'Excellent',      className: 'bg-green-100 text-green-700' },
}

function RatingPill({ rating }: { rating: number }) {
  const config = RATING_CONFIG[rating]
  if (!config) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
