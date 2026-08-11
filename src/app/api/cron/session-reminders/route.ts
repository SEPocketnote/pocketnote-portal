import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSessionReminder } from '@/lib/brevo'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'

// Called by Vercel Cron daily at 22:00 UTC (≈ 8–9am AEST/AEDT).
// Sends a reminder to the tutor and parent for every scheduled session
// in the next 20–32 hours that hasn't already had a reminder sent.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 32 * 60 * 60 * 1000)

  const { data: sessions, error } = await admin
    .from('sessions')
    .select(`
      id, scheduled_at, duration_minutes,
      bookings (
        mode, location,
        tutors ( legal_name, preferred_name, email, state ),
        parents ( name, email ),
        students ( name )
      )
    `)
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())

  if (error) {
    console.error('[cron/session-reminders]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const session of sessions ?? []) {
    const booking = session.bookings as any
    const tutor = booking?.tutors
    const parent = booking?.parents
    const student = booking?.students

    if (!tutor?.email || !parent?.email) continue

    const tz = stateToTimezone(tutor.state)
    const sessionDatetime = formatSessionFull(session.scheduled_at, tz)
    const mode = booking.mode ?? 'in-person'
    const location = booking.location ?? null

    try {
      const tutorDisplayName = tutor.preferred_name?.trim() || tutor.legal_name
      await Promise.all([
        sendSessionReminder({
          recipientName: tutor.legal_name,
          recipientEmail: tutor.email,
          studentName: student?.name ?? 'your student',
          tutorName: tutorDisplayName,
          sessionDatetime,
          mode,
          location,
          portalPath: '/tutor',
        }),
        sendSessionReminder({
          recipientName: parent.name,
          recipientEmail: parent.email,
          studentName: student?.name ?? 'your child',
          tutorName: tutorDisplayName,
          sessionDatetime,
          mode,
          location,
          portalPath: '/parent',
        }),
      ])

      await admin
        .from('sessions')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', session.id)

      sent++
    } catch (err) {
      console.error(`[cron/session-reminders] failed for session ${session.id}:`, err)
      failed++
    }
  }

  console.log(`[cron/session-reminders] sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed })
}
