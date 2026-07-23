import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const email = data.user.email?.toLowerCase().trim() ?? ''

      // Determine correct role for this email
      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean)

      let role: 'admin' | 'parent' | 'tutor' = 'parent'
      if (adminEmails.includes(email)) {
        role = 'admin'
      } else {
        const admin = createAdminClient()
        const [{ data: existingProfile }, { data: tutor }] = await Promise.all([
          admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle(),
          admin.from('tutors').select('id, user_id').eq('email', email).maybeSingle(),
        ])
        // Preserve role if admin already pre-assigned the profile (e.g. UI invite)
        if (existingProfile?.role === 'admin') {
          role = 'admin'
        } else if (tutor) {
          role = 'tutor'
          // Backfill user_id if the tutor record isn't linked yet
          if (!tutor.user_id) {
            await admin.from('tutors').update({ user_id: data.user.id }).eq('id', tutor.id)
          }
        }
      }

      // Upsert profile with correct role (trigger sets 'parent' by default)
      const admin = createAdminClient()
      await admin
        .from('profiles')
        .upsert({ id: data.user.id, role }, { onConflict: 'id' })

      if (role === 'admin') return NextResponse.redirect(`${origin}/admin`)
      if (role === 'tutor') return NextResponse.redirect(`${origin}/tutor`)
      return NextResponse.redirect(`${origin}/parent`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
