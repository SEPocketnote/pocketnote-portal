import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendChangeRequestAdminAlert } from '@/lib/brevo'
import { z } from 'zod'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'

const Schema = z.object({
  sessionId: z.string().uuid(),
  bookingId: z.string().uuid(),
  requestType: z.enum(['reschedule', 'cancellation']),
  parentNote: z.string().max(1000).optional(),
  proposedDatetime: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const d = parsed.data
  const admin = createAdminClient()

  // Verify the session belongs to this parent
  const { data: parent } = await supabase.from('parents').select('id, name').eq('user_id', user.id).single()
  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

  const { data: session } = await admin
    .from('sessions')
    .select('id, scheduled_at, booking_id, bookings(parent_id, students(name), tutors(state))')
    .eq('id', d.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if ((session.bookings as any)?.parent_id !== parent.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Block duplicate pending requests for the same session
  const { count: existing } = await admin
    .from('session_change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', d.sessionId)
    .eq('status', 'pending')

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: 'A pending request already exists for this session' }, { status: 409 })
  }

  const { data: changeRequest, error } = await admin
    .from('session_change_requests')
    .insert({
      session_id: d.sessionId,
      booking_id: d.bookingId,
      parent_id: parent.id,
      request_type: d.requestType,
      parent_note: d.parentNote ?? null,
      proposed_datetime: d.proposedDatetime ?? null,
    })
    .select('id')
    .single()

  if (error || !changeRequest) {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  // Email admin
  const tz = stateToTimezone((session.bookings as any)?.tutors?.state)
  const sessionDate = formatSessionFull(new Date(session.scheduled_at), tz)
  const studentName = (session.bookings as any)?.students?.name ?? 'Unknown'
  const proposedLabel = d.proposedDatetime
    ? format(new Date(d.proposedDatetime), 'd MMM yyyy h:mm a')
    : null

  sendChangeRequestAdminAlert({
    parentName: parent.name,
    studentName,
    requestType: d.requestType,
    sessionDate,
    parentNote: d.parentNote ?? null,
    proposedDatetime: proposedLabel,
    requestId: changeRequest.id,
  }).catch(err => console.error('[change-requests] admin alert failed:', err))

  return NextResponse.json({ id: changeRequest.id })
}
