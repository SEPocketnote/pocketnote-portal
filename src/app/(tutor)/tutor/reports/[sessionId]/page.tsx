import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stateToTimezone, formatSessionDateFullYear } from '@/lib/timezone'
import ReportForm from './ReportForm'

export default async function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors').select('id, state').eq('user_id', user!.id).single()
  if (!tutor) notFound()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, scheduled_at, bookings(students(name, year_level))')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const { data: existing } = await supabase
    .from('progress_reports')
    .select('covered, went_well, needs_work, next_session_plan, notes, internal_rating')
    .eq('session_id', sessionId)
    .maybeSingle()

  const booking = session.bookings as any
  const student = booking?.students

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/tutor/students" className="text-sm text-muted-foreground hover:text-primary">← Students</a>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {existing ? 'Edit report' : 'Write report'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {student?.name}
          {student?.year_level ? ` · ${student.year_level}` : ''}
          {session.scheduled_at ? ` · ${formatSessionDateFullYear(session.scheduled_at, stateToTimezone(tutor.state))}` : ''}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <ReportForm sessionId={sessionId} existing={existing} />
      </div>
    </div>
  )
}
