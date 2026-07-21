import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({ email: z.string().email() })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const email = parsed.data.email.toLowerCase().trim()
  const admin = createAdminClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (error) {
    // User already exists — find them and just update their profile
    if (error.message?.includes('already been registered') || error.code === 'email_exists') {
      const { data: users } = await admin.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email?.toLowerCase() === email)
      if (existing) {
        await admin.from('profiles').upsert({ id: existing.id, role: 'admin' }, { onConflict: 'id' })
        return NextResponse.json({ ok: true, alreadyExisted: true })
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Pre-assign admin role so the auth callback preserves it
  await admin.from('profiles').upsert({ id: invited.user.id, role: 'admin' }, { onConflict: 'id' })

  return NextResponse.json({ ok: true })
}
