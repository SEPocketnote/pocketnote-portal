import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCancellationNotification } from '@/lib/brevo'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import { z } from 'zod'

const Schema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(15).optional(),
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

  const admin = createAdminClient()

  const updates: Record<string, string | number> = {}
  if (parsed.data.status) updates.status = parsed.data.status
  if (parsed.data.scheduled_at) updates.scheduled_at = parsed.data.scheduled_at
  if (parsed.data.duration_minutes !== undefined) updates.duration_minutes = parsed.data.duration_minutes

  const { data: session, error } = await admin
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select('booking_id, scheduled_at')
    .single()

  if (error || !session) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 500 })

  // Send cancellation emails to tutor and parent
  if (parsed.data.status === 'cancelled') {
    try {
      const { data: booking } = await admin
        .from('bookings')
        .select('mode, location, tutors(legal_name, email, state), students(name), parents(name, email)')
        .eq('id', session.booking_id)
        .single()

      if (booking) {
        const tutor = booking.tutors as any
        const parent = booking.parents as any
        const student = booking.students as any
        const tz = stateToTimezone(tutor?.state)
        const sessionDatetime = `${formatSessionDateFullYear(session.scheduled_at, tz)} at ${formatTime(session.scheduled_at, tz)}`

        await Promise.all([
          tutor?.email && sendCancellationNotification({
            recipientName: tutor.legal_name,
            recipientEmail: tutor.email,
            studentName: student?.name ?? 'your student',
            tutorName: tutor.legal_name,
            sessionDatetime,
            mode: booking.mode,
            location: booking.location,
            portalPath: '/tutor/students',
          }),
          parent?.email && sendCancellationNotification({
            recipientName: parent.name,
            recipientEmail: parent.email,
            studentName: student?.name ?? 'your student',
            tutorName: tutor?.legal_name ?? 'your tutor',
            sessionDatetime,
            mode: booking.mode,
            location: booking.location,
            portalPath: '/parent',
          }),
        ])
      }
    } catch (emailErr) {
      console.error('[sessions] cancellation email failed:', emailErr)
    }
  }

  // Recount completed sessions and sync to booking
  const { count } = await admin
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('booking_id', session.booking_id)
    .eq('status', 'completed')

  await admin
    .from('bookings')
    .update({ sessions_completed: count ?? 0 })
    .eq('id', session.booking_id)

  return NextResponse.json({ ok: true })
}
