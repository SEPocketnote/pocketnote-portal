import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({ email: z.string().email() })

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const { email } = parsed.data
  const normalised = email.toLowerCase().trim()

  const allowed = await isAuthorisedEmail(normalised)

  // Always return the same message regardless — don't reveal whether email exists
  if (!allowed) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createClient()
  await supabase.auth.signInWithOtp({
    email: normalised,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  return NextResponse.json({ ok: true })
}

async function isAuthorisedEmail(email: string): Promise<boolean> {
  // Admin list from env
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean)

  if (adminEmails.includes(email)) return true

  // Check parents and tutors tables using service role (bypasses RLS)
  const admin = createAdminClient()
  const [{ data: parent }, { data: tutor }] = await Promise.all([
    admin.from('parents').select('id').eq('email', email).maybeSingle(),
    admin.from('tutors').select('id').eq('email', email).maybeSingle(),
  ])

  return !!(parent || tutor)
}
