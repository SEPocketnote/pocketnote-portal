import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Route based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role
      if (role === 'admin') return NextResponse.redirect(`${origin}/admin`)
      if (role === 'tutor') return NextResponse.redirect(`${origin}/tutor`)
      if (role === 'parent') return NextResponse.redirect(`${origin}/parent`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
