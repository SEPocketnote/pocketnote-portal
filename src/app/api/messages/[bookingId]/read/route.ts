import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role === 'admin') return NextResponse.json({ ok: true })

  // Mark all messages from the OTHER role as read (RLS scopes to this user's bookings)
  const otherRole = profile.role === 'parent' ? 'tutor' : 'parent'
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('sender_role', otherRole)
    .is('read_at', null)

  return NextResponse.json({ ok: true })
}
