'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Sign in to Pocketnote</h1>

        {reason === 'tos' && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
            You must accept our Terms of Service to use Pocketnote. Sign in again to continue.
          </div>
        )}

        {sent ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">Check your email</p>
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-4">
              If you have an account, a sign-in link is on its way to <strong>{email}</strong>.
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
