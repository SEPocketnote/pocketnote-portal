import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: reports } = parent
    ? await supabase
        .from('progress_reports')
        .select(`
          id, covered, went_well, needs_work, next_session_plan, notes, submitted_at,
          sessions ( scheduled_at, bookings ( students ( name ), tutors ( legal_name ) ) )
        `)
        .eq('sessions.bookings.parent_id', parent.id)
        .order('submitted_at', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Progress Reports</h1>

      {!reports?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No reports yet</p>
          <p className="text-sm text-muted-foreground">
            Reports will appear here after each session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const session = r.sessions as any
            const booking = session?.bookings as any
            return (
              <div key={r.id} className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold">
                      {booking?.students?.name ?? 'Student'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session?.scheduled_at
                        ? format(new Date(session.scheduled_at), 'EEE d MMM yyyy')
                        : ''}
                      {booking?.tutors?.legal_name
                        ? ` · with ${booking.tutors.legal_name}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.submitted_at), 'd MMM')}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  {r.covered && <ReportRow label="What we covered" value={r.covered} />}
                  {r.went_well && <ReportRow label="What went well" value={r.went_well} />}
                  {r.needs_work && <ReportRow label="Areas to work on" value={r.needs_work} />}
                  {r.next_session_plan && <ReportRow label="Plan for next session" value={r.next_session_plan} />}
                  {r.notes && <ReportRow label="Additional notes" value={r.notes} />}
                </div>
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
