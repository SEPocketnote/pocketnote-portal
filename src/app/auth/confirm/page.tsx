'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleSession() {
      let session = null

      // Server-generated magic links redirect with hash fragment tokens
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        const { data } = await supabase.auth.setSession({ access_token, refresh_token })
        session = data.session
      } else {
        const { data } = await supabase.auth.getSession()
        session = data.session
      }

      if (!session) {
        router.replace('/login?error=auth')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'admin') router.replace('/admin')
      else if (profile?.role === 'tutor') router.replace('/tutor')
      else router.replace('/parent')
    }

    handleSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  )
}
