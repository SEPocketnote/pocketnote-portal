import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendParentWelcome } from '@/lib/brevo'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: parent } = await admin.from('parents').select('name, email, user_id').eq('id', id).single()
  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

  const email = parent.email.toLowerCase().trim()
  let authUserId: string | undefined = parent.user_id ?? undefined

  if (!authUserId) {
    const { data: { users } } = await admin.auth.admin.listUsers()
    const existing = users.find(u => u.email?.toLowerCase() === email)
    if (existing) {
      authUserId = existing.id
      await admin.from('parents').update({ user_id: authUserId }).eq('id', id)
    }
  }

  // Create auth user if they don't have one yet (portal-less parents created without invite)
  if (!authUserId) {
    const { data: authData } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (authData?.user) {
      authUserId = authData.user.id
      await admin.from('profiles').upsert({ id: authUserId, role: 'parent' }, { onConflict: 'id' })
      await admin.from('parents').update({ user_id: authUserId }).eq('id', id)
    }
  }

  let inviteUrl: string | undefined
  if (authUserId) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/confirm` },
    })
    inviteUrl = linkData?.properties?.action_link
  }

  try {
    await sendParentWelcome({ name: parent.name, email, inviteUrl })
  } catch (err) {
    console.error('[parents/invite] email failed:', err)
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
