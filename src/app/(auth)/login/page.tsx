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
    <div className="min-h-screen flex">

      {/* ── Left: form ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <PocketnoteMark size={32} />
            <span className="text-xl font-bold text-foreground tracking-tight">Pocketnote</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Enter your email and we&apos;ll send you a sign-in link.
          </p>

          {reason === 'tos' && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
              You must accept our Terms of Service to use Pocketnote. Sign in again to continue.
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-4">
                <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-center">Check your email</h2>
              <p className="text-sm text-muted-foreground text-center">
                A sign-in link is on its way to <strong className="text-foreground">{email}</strong>.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Didn&apos;t get it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary underline underline-offset-2 hover:opacity-80"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Sending…' : 'Continue →'}
              </button>
            </form>
          )}

          <p className="mt-10 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Pocketnote. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right: brand panel ─────────────────────────────── */}
      <div className="hidden lg:flex w-[46%] shrink-0 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #E26F6F 0%, #d45f5f 40%, #c04a7a 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
            <PocketnoteMark size={52} color="white" />
          </div>

          <h2 className="text-4xl font-bold text-white tracking-tight mb-3">Pocketnote</h2>
          <p className="text-white/75 text-base max-w-[260px] leading-relaxed">
            Smart tutoring, expertly managed for you.
          </p>

          <div className="mt-12 border border-white/25 rounded-2xl px-8 py-5 bg-white/10 backdrop-blur-sm text-center">
            <p className="text-white/60 text-xs mb-1">Powered by</p>
            <p className="text-white font-semibold text-sm tracking-wide">pocketnote.com.au</p>
          </div>
        </div>
      </div>

    </div>
  )
}

function PocketnoteMark({ size = 40, color = '#E26F6F' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill={color === 'white' ? 'rgba(255,255,255,0.15)' : color + '18'} />
      <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="system-ui, sans-serif" fill={color}>P</text>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
