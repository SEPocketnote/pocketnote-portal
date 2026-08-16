import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by /auth/confirm after the browser Supabase client has set the
// session from the URL hash. Replicates the role-setup logic from
// /auth/callback so first-time users get their profile and tutor link.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
