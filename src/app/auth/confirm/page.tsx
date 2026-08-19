'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Landing page for magic link / invite clicks.
//
// The admin generateLink API produces a Supabase-hosted verification URL.
// When Supabase processes it, it redirects here with tokens in the URL
// fragment (#access_token=...) because no PKCE verifier was set up
// client-side. The server-side /auth/callback route never sees fragments,
// so those logins silently fail. The browser Supabase client reads the
// fragment automatically and sets the session in cookies. Once the session
// is ready we call /api/auth/confirm to do role setup and get the redirect.

export default function AuthConfirmPage() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    async function doRedirect(accessToken: string) {
      if (handled.current) return
      handled.current = true
      try {
        const res = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const { redirect } = await res.json()
        router.replace(redirect ?? '/login?error=auth')
      } catch {
        router.replace('/login?error=auth')
      }
    }

    // The browser client processes the URL hash automatically on init.
    // onAuthStateChange fires once the session is established from the hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        doRedirect(session.access_token)
      }
    })

    // Also handle the case where the session was already set before the
    // listener was attached (e.g. page reload with valid cookies).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) doRedirect(session.access_token)
    })

    const timeout = setTimeout(() => {
      if (!handled.current) router.replace('/login?error=auth')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  )
}
