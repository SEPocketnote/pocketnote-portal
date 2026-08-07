import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'
import { sendAvailabilityConflictAdmin, sendAvailabilityConflictTutor } from '@/lib/brevo'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NUM: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
}

function addMinutesToHHMMSS(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}:00`
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch the slot before deleting so we can check conflicts
  const { data: slot } = await supabase
    .from('tutor_availability')
    .select('id, day_of_week, start_time, end_time, tutor_id')
    .eq('id', id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  // Get tutor details for timezone + email
  const { data: tutor } = await admin
    .from('tutors')
    .select('id, legal_name, email, state')
    .eq('id', slot.tutor_id)
    .single()

  // Delete the slot
  const { error } = await supabase.from('tutor_availability').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conflict check — find upcoming sessions for this tutor
  const tz = stateToTimezone(tutor?.state)
  const { data: upcomingSessions } = await admin
    .from('sessions')
    .select(`
      id, scheduled_at, duration_minutes,
      bookings!inner ( tutor_id, students ( name ) )
    `)
    .eq('bookings.tutor_id', slot.tutor_id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })

  type ConflictEntry = { studentName: string; sessionDate: string }
  const conflicts: ConflictEntry[] = []

  for (const session of upcomingSessions ?? []) {
    const localParts = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      weekday: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(session.scheduled_at))

    const get = (t: string) => localParts.find(p => p.type === t)?.value ?? ''
    const sessionDayNum = DAY_NUM[get('weekday')] ?? -1
    if (sessionDayNum !== slot.day_of_week) continue

    const sessionHHMMSS = `${get('hour')}:${get('minute')}:00`
    const sessionEndHHMMSS = addMinutesToHHMMSS(sessionHHMMSS, (session as any).duration_minutes ?? 60)

    // Overlap: session starts before slot ends AND session ends after slot starts
    if (sessionHHMMSS < slot.end_time && sessionEndHHMMSS > slot.start_time) {
      const booking = (session as any).bookings
      conflicts.push({
        studentName: booking?.students?.name ?? 'Unknown student',
        sessionDate: formatSessionFull(session.scheduled_at, tz),
      })
    }
  }

  if (conflicts.length > 0 && tutor) {
    const slotDayName = DAYS[slot.day_of_week] ?? 'Unknown'
    const fmt = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'pm' : 'am'
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
    }
    const slotLabel = `${slotDayName} ${fmt(slot.start_time)} – ${fmt(slot.end_time)}`

    await Promise.allSettled([
      sendAvailabilityConflictAdmin({
        tutorName: tutor.legal_name,
        tutorEmail: tutor.email,
        slotLabel,
        conflicts,
      }),
      sendAvailabilityConflictTutor({
        tutorName: tutor.legal_name,
        tutorEmail: tutor.email,
        slotLabel,
        conflicts,
      }),
    ])
  }

  return NextResponse.json({ ok: true, conflicts })
}
