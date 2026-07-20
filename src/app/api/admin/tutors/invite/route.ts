import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTutorInvite } from '@/lib/brevo'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email } = await request.json()
  if (!name || !email) return NextResponse.json({ error: 'Missing name or email' }, { status: 400 })

  await sendTutorInvite({ name, email }).catch(err =>
    console.error('[invite] email failed:', err)
  )

  return NextResponse.json({ ok: true })
}
