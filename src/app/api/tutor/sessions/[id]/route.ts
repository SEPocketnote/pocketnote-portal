import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('id').eq('user_id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Verify this session belongs to one of the tutor's bookings
  const { data: session } = await admin
    .from('sessions')
    .select('id, status, booking_id, bookings(tutor_id)')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((session.bookings as any)?.tutor_id !== tutor.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.status !== 'scheduled') return NextResponse.json({ error: 'Session is not scheduled' }, { status: 400 })

  await admin.from('sessions').update({ status: 'completed' }).eq('id', id)

  // Sync sessions_completed count on the booking
  const { count } = await admin
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('booking_id', session.booking_id)
    .eq('status', 'completed')

  await admin.from('bookings').update({ sessions_completed: count ?? 0 }).eq('id', session.booking_id)

  return NextResponse.json({ ok: true })
}
