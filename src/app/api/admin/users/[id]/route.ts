import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (user.id === id) return NextResponse.json({ error: 'Cannot remove your own admin access' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await request.json()
  const admin = createAdminClient()

  if (action === 'remove_admin') {
    await admin.from('profiles').update({ role: 'parent' }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'ban') {
    await admin.auth.admin.updateUserById(id, { ban_duration: '876600h' }) // 100 years
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
