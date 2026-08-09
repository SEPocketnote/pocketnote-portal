'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Stripe wordmark as inline SVG (official colours, no external fetch)
function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" className="h-5 inline-block align-middle">
      <path
        d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.45.94V6.27h3.94l.23 1.06c.52-.72 1.55-1.3 3.19-1.3 3.39 0 6.56 2.96 6.56 7.51 0 5.3-3.1 6.76-6.55 6.76zm-.5-10.19c-.96 0-1.54.38-1.93.9l.02 6.44c.35.44.91.84 1.91.84 1.76 0 2.6-1.84 2.6-4.09 0-2.26-.85-4.09-2.6-4.09zM28.24 5.07c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.45.94V6.27h3.94l.23 1.06c.52-.72 1.55-1.3 3.19-1.3 3.39 0 6.56 2.96 6.56 7.51 0 5.3-3.1 6.76-6.55 6.76zm-.5-10.19c-.96 0-1.54.38-1.93.9l.02 6.44c.35.44.91.84 1.91.84 1.76 0 2.6-1.84 2.6-4.09 0-2.26-.85-4.09-2.6-4.09zM12.95 20.3c-2.83 0-5.1-1.15-6.4-3.4L9.77 15c.58 1.15 1.64 2.03 3.26 2.03 1.32 0 2.14-.6 2.14-1.7 0-1.1-.74-1.67-2.7-2.35-2.74-.96-4.76-2.23-4.76-5.2 0-2.8 2.1-4.77 5.46-4.77 2.5 0 4.37 1.03 5.6 2.85l-2.96 2.18c-.61-.94-1.5-1.64-2.72-1.64-1.08 0-1.78.54-1.78 1.47 0 .97.74 1.45 2.8 2.16 2.88 1.01 4.66 2.35 4.66 5.35 0 3.14-2.38 4.92-5.82 4.92zM1.36 20.3C.6 20.3 0 19.7 0 18.94V5.06c0-.76.6-1.36 1.36-1.36h3.33c.76 0 1.36.6 1.36 1.36v13.88c0 .76-.6 1.36-1.36 1.36H1.36z"
        fill="#635BFF"
      />
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
        <p>Your card details are stored securely with Stripe — never on Pocketnote&apos;s servers. You won&apos;t be charged today.</p>
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
      <PaymentElement options={{ layout: 'tabs' }} />
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
