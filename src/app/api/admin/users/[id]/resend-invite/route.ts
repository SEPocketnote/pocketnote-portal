import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminInvite } from '@/lib/brevo'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: { user: target }, error } = await admin.auth.admin.getUserById(id)
  if (error || !target?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  })

  const inviteUrl = linkData?.properties?.action_link
  if (!inviteUrl) return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })

  try {
    await sendAdminInvite({ email: target.email, inviteUrl })
  } catch (err) {
    console.error('[resend-admin-invite] email failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
