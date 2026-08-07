import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toZonedDatetimeInput, toUtcFromZoned } from '@/lib/timezone'
import { z } from 'zod'

const Schema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  action: z.enum(['cancel_enrolment']).optional(),
  tutorId: z.string().uuid().optional(),
  futureSessionTime: z.string().optional(), // HH:MM in tutor local time
  timezone: z.string().optional(),
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
  const d = parsed.data

  // Cancel enrolment: cancel booking + all future scheduled sessions
  if (d.action === 'cancel_enrolment') {
    const now = new Date().toISOString()
    const [bookingRes, sessionsRes] = await Promise.all([
      admin.from('bookings').update({ status: 'cancelled' }).eq('id', id),
      admin.from('sessions')
        .update({ status: 'cancelled' })
        .eq('booking_id', id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now),
    ])
    if (bookingRes.error) return NextResponse.json({ error: bookingRes.error.message }, { status: 500 })
    if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Reassign tutor
  if (d.tutorId) {
    const { error } = await admin.from('bookings').update({ tutor_id: d.tutorId }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Update future session time
  if (d.futureSessionTime && d.timezone) {
    const now = new Date().toISOString()
    const { data: futureSessions, error: fetchError } = await admin
      .from('sessions')
      .select('id, scheduled_at')
      .eq('booking_id', id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

    const updates = (futureSessions ?? []).map(s => {
      const localDatetime = toZonedDatetimeInput(s.scheduled_at, d.timezone!)
      const datePart = localDatetime.slice(0, 10) // YYYY-MM-DD
      const newLocalDatetime = `${datePart}T${d.futureSessionTime}`
      const newUtc = toUtcFromZoned(newLocalDatetime, d.timezone!)
      return admin
        .from('sessions')
        .update({ scheduled_at: newUtc.toISOString() })
        .eq('id', s.id)
    })

    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Plain status update
  if (d.status) {
    const { error } = await admin.from('bookings').update({ status: d.status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
