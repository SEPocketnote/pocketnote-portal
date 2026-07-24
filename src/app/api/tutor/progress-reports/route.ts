import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  session_id: z.string().uuid(),
  covered: z.string().max(2000).optional(),
  went_well: z.string().max(2000).optional(),
  needs_work: z.string().max(2000).optional(),
  next_session_plan: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  internal_rating: z.number().int().min(1).max(5).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase
    .from('tutors').select('id').eq('user_id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { session_id, ...fields } = parsed.data

  // Verify the session belongs to a booking for this tutor
  const { data: session } = await supabase
    .from('sessions')
    .select('id, booking_id, bookings(tutor_id)')
    .eq('id', session_id)
    .single()

  if (!session || (session.bookings as any)?.tutor_id !== tutor.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: report, error } = await supabase
    .from('progress_reports')
    .upsert(
      { session_id, tutor_id: tutor.id, ...fields },
      { onConflict: 'session_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark session as completed
  await supabase.from('sessions').update({ status: 'completed' }).eq('id', session_id)

  return NextResponse.json({ report })
}
