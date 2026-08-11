import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('id').eq('user_id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await supabase
    .from('tutor_unavailability')
    .select('id, start_date, end_date, is_all_day, start_time, end_time, notes')
    .eq('tutor_id', tutor.id)
    .order('start_date')

  return NextResponse.json({ blocks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('id').eq('user_id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { start_date, end_date, is_all_day, start_time, end_time, notes } = body

  if (!start_date || !end_date) return NextResponse.json({ error: 'Dates required' }, { status: 400 })
  if (end_date < start_date) return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
  if (!is_all_day && (!start_time || !end_time)) return NextResponse.json({ error: 'Times required when not all day' }, { status: 400 })

  const { data, error } = await supabase
    .from('tutor_unavailability')
    .insert({
      tutor_id: tutor.id,
      start_date,
      end_date,
      is_all_day: !!is_all_day,
      start_time: is_all_day ? null : start_time,
      end_time: is_all_day ? null : end_time,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data })
}
