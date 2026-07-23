import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTutorInvite } from '@/lib/brevo'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email } = await request.json()
  if (!name || !email) return NextResponse.json({ error: 'Missing name or email' }, { status: 400 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  })
  const inviteUrl = linkData?.properties?.action_link

  try {
    await sendTutorInvite({ name, email, inviteUrl })
  } catch (err) {
    console.error('[invite] email failed:', err)
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
