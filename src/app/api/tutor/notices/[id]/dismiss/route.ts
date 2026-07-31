import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Not a tutor' }, { status: 403 })

  await supabase
    .from('tutor_notice_dismissals')
    .upsert({ notice_id: id, tutor_id: tutor.id }, { onConflict: 'notice_id,tutor_id' })

  return NextResponse.json({ ok: true })
}
