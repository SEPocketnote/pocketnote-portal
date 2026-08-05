import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> }

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookiesToSet: CookieEntry[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(incoming: CookieEntry[]) {
            incoming.forEach((c) => cookiesToSet.push(c))
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const email = data.user.email?.toLowerCase().trim() ?? ''

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
        if (existingProfile?.role === 'admin') {
          role = 'admin'
        } else if (tutor) {
          role = 'tutor'
          if (!tutor.user_id) {
            await admin.from('tutors').update({ user_id: data.user.id }).eq('id', tutor.id)
          }
        }
      }

      const admin = createAdminClient()
      await admin
        .from('profiles')
        .upsert({ id: data.user.id, role }, { onConflict: 'id' })

      const destination =
        role === 'admin' ? `${origin}/admin` :
        role === 'tutor' ? `${origin}/tutor` :
        `${origin}/parent`

      const response = NextResponse.redirect(destination)
      cookiesToSet.forEach(({ name, value, options }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.cookies.set(name, value, options as any),
      )
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
