import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled']),
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

  // Update session status
  const { data: session, error } = await admin
    .from('sessions')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('booking_id')
    .single()

  if (error || !session) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 500 })

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
