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
        const { data: tutor } = await admin
          .from('tutors')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (tutor) role = 'tutor'
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
