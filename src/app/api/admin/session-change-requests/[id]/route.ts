import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendChangeRequestResolution } from '@/lib/brevo'
import { z } from 'zod'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'

const Schema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().max(500).optional(),
  newDatetime: z.string().optional(), // ISO string — for reschedule approvals
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { action, adminNote, newDatetime } = parsed.data
  const admin = createAdminClient()

  // Fetch the change request with full context
  const { data: req } = await admin
    .from('session_change_requests')
    .select(`
      id, request_type, session_id, status,
      parents ( id, name, email ),
      sessions ( id, scheduled_at, bookings ( students ( name ), tutors ( state ) ) )
    `)
    .eq('id', id)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (req.status !== 'pending') return NextResponse.json({ error: 'Request already resolved' }, { status: 409 })

  const parent = req.parents as any
  const session = req.sessions as any
  const tz = stateToTimezone(session?.bookings?.tutors?.state)
  const studentName = session?.bookings?.students?.name ?? 'Unknown'

  if (action === 'approve') {
    if (req.request_type === 'reschedule') {
      if (!newDatetime) return NextResponse.json({ error: 'New datetime required for reschedule approval' }, { status: 400 })
      await admin.from('sessions').update({ scheduled_at: newDatetime, status: 'scheduled' }).eq('id', req.session_id)
    } else {
      // cancellation
      await admin.from('sessions').update({ status: 'cancelled' }).eq('id', req.session_id)
    }
  }

  await admin
    .from('session_change_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_note: adminNote ?? null,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', id)

  // Email parent
  const originalDate = formatSessionFull(new Date(session.scheduled_at), tz)
  const newDateLabel = newDatetime ? formatSessionFull(new Date(newDatetime), tz) : null

  sendChangeRequestResolution({
    parentName: parent.name,
    parentEmail: parent.email,
    requestType: req.request_type as 'reschedule' | 'cancellation',
    studentName,
    sessionDate: originalDate,
    approved: action === 'approve',
    newDatetime: newDateLabel,
    adminNote: adminNote ?? null,
  }).catch(err => console.error('[change-requests] resolution email failed:', err))

  return NextResponse.json({ ok: true })
}
