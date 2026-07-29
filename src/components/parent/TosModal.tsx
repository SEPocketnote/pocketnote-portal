'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TosModal() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    const res = await fetch('/api/parent/accept-tos', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    } else {
      setLoading(false)
    }
  }

  async function handleDecline() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login?reason=tos')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-primary tracking-tight">Pocketnote</span>
          <h2 className="text-xl font-bold mt-4 mb-2">Welcome to your parent portal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Before you continue, please read and accept our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="bg-muted/40 rounded-xl p-4 mb-6 max-h-44 overflow-y-auto text-sm text-foreground/80 leading-relaxed space-y-3">
          <p>
            By using Pocketnote you agree to our{' '}
            <a
              href="https://pocketnote.com.au/terms-service/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://pocketnote.com.au/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p>
            Your personal information is handled in accordance with Australian Privacy Law. We collect and use your data only to provide and improve our tutoring services.
          </p>
          <p>
            You can contact us at any time at{' '}
            <a href="mailto:hello@pocketnote.com.au" className="text-primary underline">
              hello@pocketnote.com.au
            </a>{' '}
            with questions about how we use your data.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'I accept the Terms of Service'}
          </button>
          <button
            onClick={handleDecline}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            Decline and sign out
          </button>
        </div>
      </div>
    </div>
  )
}
