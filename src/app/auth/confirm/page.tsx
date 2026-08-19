'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Landing page for invite magic link clicks.
//
// Supabase may redirect here with either:
//   - ?code=... (PKCE flow, newer Supabase versions)
//   - #access_token=... (implicit flow, older behaviour)
//
// For the code flow we delegate straight to /auth/callback which already
// handles exchangeCodeForSession server-side. For the hash flow the browser
// Supabase client reads the fragment and fires onAuthStateChange.

export default function AuthConfirmPage() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const tokenHash = params.get('token_hash')
    const tokenType = (params.get('type') ?? 'magiclink') as 'magiclink' | 'invite' | 'email'

    // If Supabase redirected with ?code=... delegate to the server-side handler.
    if (code) {
      handled.current = true
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
      return
    }

    // Invite flow: verify the token_hash directly from the browser client
    // (no PKCE verifier required).
    if (tokenHash) {
      handled.current = true
      void (async () => {
        const supabase = createClient()
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
        if (!error && data.session) {
          const res = await fetch('/api/auth/confirm', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          })
          const { redirect } = await res.json().catch(() => ({ redirect: '/login?error=auth' }))
          router.replace(redirect ?? '/login?error=auth')
        } else {
          router.replace('/login?error=auth')
        }
      })()
      return
    }

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

    // Hash token flow: browser client reads #access_token automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        doRedirect(session.access_token)
      }
    })

    // Handle the case where the session was already established before the
    // listener attached (e.g. page reload with valid cookies).
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
