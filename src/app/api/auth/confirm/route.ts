import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by /auth/confirm after the browser Supabase client has set the
// session from the URL hash. Replicates the role-setup logic from
// /auth/callback so first-time users get their profile and tutor link.
export async function POST(request: Request) {
  // Prefer the access token passed directly from the client (avoids a cookie
  // race condition on first-time logins where the session cookie may not yet
  // be present when this request arrives).
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let user: { id: string; email?: string } | null = null

  if (token) {
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await client.auth.getUser(token)
    user = data.user ?? null
  }

  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }

  if (!user) {
    return NextResponse.json({ redirect: '/login?error=auth' })
  }

  const email = user.email?.toLowerCase().trim() ?? ''
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.toLowerCase().trim()).filter(Boolean)

  let role: 'admin' | 'parent' | 'tutor' = 'parent'
  const admin = createAdminClient()

  if (adminEmails.includes(email)) {
    role = 'admin'
  } else {
    const [{ data: existingProfile }, { data: tutor }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('tutors').select('id, user_id').eq('email', email).maybeSingle(),
    ])
    if (existingProfile?.role === 'admin') {
      role = 'admin'
    } else if (tutor) {
      role = 'tutor'
      if (!tutor.user_id) {
        await admin.from('tutors').update({ user_id: user.id }).eq('id', tutor.id)
      }
    }
  }

  await admin.from('profiles').upsert({ id: user.id, role }, { onConflict: 'id' })

  const redirect =
    role === 'admin' ? '/admin' :
    role === 'tutor' ? '/tutor' :
    '/parent'

  return NextResponse.json({ redirect })
}
