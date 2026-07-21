import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('id').eq('user_id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { day_of_week, start_time, end_time } = parsed.data

  const { data: slot, error } = await supabase
    .from('tutor_availability')
    .insert({
      tutor_id: tutor.id,
      day_of_week,
      start_time: `${start_time}:00`,
      end_time: `${end_time}:00`,
    })
    .select('id, day_of_week, start_time, end_time')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That slot already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ slot })
}
