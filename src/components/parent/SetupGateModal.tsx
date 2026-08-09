'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function StripeLogo() {
  return (
    <svg width="48" height="20" viewBox="0 0 360 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle">
      <path fillRule="evenodd" clipRule="evenodd" d="M360 77.4001C360 51.8001 347.6 31.6001 323.9 31.6001C300.1 31.6001 285.7 51.8001 285.7 77.2001C285.7 107.3 302.7 122.5 327.1 122.5C339 122.5 348 119.8 354.8 116V96.0001C348 99.4001 340.2 101.5 330.3 101.5C320.6 101.5 312 98.1001 310.9 86.3001H359.8C359.8 85.0001 360 79.8001 360 77.4001ZM310.6 67.9001C310.6 56.6001 317.5 51.9001 323.8 51.9001C329.9 51.9001 336.4 56.6001 336.4 67.9001H310.6Z" fill="#533AFD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M247.1 31.6001C237.3 31.6001 231 36.2001 227.5 39.4001L226.2 33.2001H204.2V149.8L229.2 144.5L229.3 116.2C232.9 118.8 238.2 122.5 247 122.5C264.9 122.5 281.2 108.1 281.2 76.4001C281.1 47.4001 264.6 31.6001 247.1 31.6001ZM241.1 100.5C235.2 100.5 231.7 98.4001 229.3 95.8001L229.2 58.7001C231.8 55.8001 235.4 53.8001 241.1 53.8001C250.2 53.8001 256.5 64.0001 256.5 77.1001C256.5 90.5001 250.3 100.5 241.1 100.5Z" fill="#533AFD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M169.8 25.7L194.9 20.3V0L169.8 5.3V25.7Z" fill="#533AFD"/>
      <path d="M194.9 33.3H169.8V120.8H194.9V33.3Z" fill="#533AFD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M142.9 40.7L141.3 33.3H119.7V120.8H144.7V61.5C150.6 53.8 160.6 55.2 163.7 56.3V33.3C160.5 32.1 148.8 29.9 142.9 40.7Z" fill="#533AFD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M92.8999 11.6001L68.4999 16.8001L68.3999 96.9001C68.3999 111.7 79.4999 122.6 94.2999 122.6C102.5 122.6 108.5 121.1 111.8 119.3V99.0001C108.6 100.3 92.7999 104.9 92.7999 90.1001V54.6001H111.8V33.3001H92.7999L92.8999 11.6001Z" fill="#533AFD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M25.3 58.7001C25.3 54.8001 28.5 53.3001 33.8 53.3001C41.4 53.3001 51 55.6001 58.6 59.7001V36.2001C50.3 32.9001 42.1 31.6001 33.8 31.6001C13.5 31.6001 0 42.2001 0 59.9001C0 87.5001 38 83.1001 38 95.0001C38 99.6001 34 101.1 28.4 101.1C20.1 101.1 9.5 97.7001 1.1 93.1001V116.9C10.4 120.9 19.8 122.6 28.4 122.6C49.2 122.6 63.5 112.3 63.5 94.4001C63.4 64.6001 25.3 69.9001 25.3 58.7001Z" fill="#533AFD"/>
    </svg>
  )
}

function TosText({ showCardNote }: { showCardNote: boolean }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4 mb-5 text-sm text-foreground/80 leading-relaxed space-y-2">
      <p>
        By continuing you agree to our{' '}
        <a href="https://pocketnote.com.au/terms-service/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="https://pocketnote.com.au/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Privacy Policy
        </a>
        .
      </p>
      {showCardNote && (
        <p>Your card details are stored securely with Stripe. You won&apos;t be charged today.</p>
      )}
    </div>
  )
}

function CardForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Card setup failed. Please try again.')
      setLoading(false)
      return
    }

    const paymentMethodId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent?.payment_method?.id

    if (!paymentMethodId) {
      setError('Could not confirm card. Please try again.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/parent/complete-setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethodId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Setup failed. Please try again.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs', terms: { card: 'never' }, wallets: { applePay: 'never', googlePay: 'never' } }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? 'Saving…' : 'Accept terms & save card'}
      </button>
    </form>
  )
}

function TosOnlyForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    const res = await fetch('/api/parent/accept-tos', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    } else {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? 'Saving…' : 'Accept terms & continue'}
      </button>
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-11 bg-muted rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-11 bg-muted rounded-lg" />
        <div className="h-11 bg-muted rounded-lg" />
      </div>
      <div className="h-11 bg-primary/20 rounded-xl mt-2" />
    </div>
  )
}

export default function SetupGateModal({ hasCard }: { hasCard: boolean }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (hasCard) return
    fetch('/api/parent/setup-intent', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setFetchError('Could not load payment form. Please refresh.')
      })
      .catch(() => setFetchError('Could not load payment form. Please refresh.'))
  }, [hasCard])

  async function handleDecline() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/login?reason=tos')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">

        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-primary tracking-tight">Pocketnote</span>
          <h2 className="text-xl font-bold mt-4 mb-2">Welcome to the Pocketnote portal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasCard
              ? 'Before you continue, please read and accept our Terms of Service and Privacy Policy.'
              : 'To get started, please accept our Terms of Service and save a payment method for your sessions.'}
          </p>
        </div>

        <TosText showCardNote={!hasCard} />

        {hasCard ? (
          <TosOnlyForm />
        ) : fetchError ? (
          <p className="text-sm text-destructive mb-4">{fetchError}</p>
        ) : !clientSecret ? (
          <CardSkeleton />
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'stripe', variables: { colorPrimary: '#E05A4B' } },
            }}
          >
            <CardForm />
          </Elements>
        )}

        {/* Stripe trust badge */}
        {!hasCard && (
          <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-muted-foreground">
            <span>Secured by</span>
            <StripeLogo />
          </div>
        )}

        <button
          onClick={handleDecline}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          Decline and sign out
        </button>
      </div>
    </div>
  )
}
