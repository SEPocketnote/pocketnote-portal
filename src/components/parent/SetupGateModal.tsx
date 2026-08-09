'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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

    // Confirm the SetupIntent — redirect: 'if_required' means no redirect for standard cards
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

    // Save payment method + accept ToS atomically
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

export default function SetupGateModal() {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/parent/setup-intent', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setFetchError('Could not initialise payment setup. Please refresh.')
      })
      .catch(() => setFetchError('Could not initialise payment setup. Please refresh.'))
  }, [])

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
          <h2 className="text-xl font-bold mt-4 mb-2">Welcome to your parent portal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To get started, please accept our Terms of Service and save a payment method for your sessions.
          </p>
        </div>

        {/* ToS summary */}
        <div className="bg-muted/40 rounded-xl p-4 mb-6 text-sm text-foreground/80 leading-relaxed space-y-2">
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
          <p>
            Your card will be saved securely for session billing. You won&apos;t be charged today.
          </p>
        </div>

        {/* Stripe card element */}
        {fetchError ? (
          <p className="text-sm text-destructive mb-4">{fetchError}</p>
        ) : !clientSecret ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            Loading payment form…
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: { colorPrimary: '#E05A4B' },
              },
            }}
          >
            <CardForm />
          </Elements>
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
