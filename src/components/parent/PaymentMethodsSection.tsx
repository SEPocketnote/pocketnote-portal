'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, Star, Trash2, Plus, X } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PaymentMethod = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
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
      setError(stripeError.message ?? 'Card setup failed.')
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
      setError(data.error ?? 'Failed to save card.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Add new card</p>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save card'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted/40 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

function AddCardSection({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  async function openForm() {
    const res = await fetch('/api/parent/setup-intent', { method: 'POST' })
    const data = await res.json()
    if (data.clientSecret) {
      setClientSecret(data.clientSecret)
      setOpen(true)
    }
  }

  function handleSuccess() {
    setOpen(false)
    setClientSecret(null)
    onAdded()
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium mt-2"
      >
        <Plus className="w-4 h-4" /> Add new card
      </button>
    )
  }

  return clientSecret ? (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#E05A4B' } },
      }}
    >
      <AddCardForm onSuccess={handleSuccess} onCancel={() => { setOpen(false); setClientSecret(null) }} />
    </Elements>
  ) : null
}

export default function PaymentMethodsSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')

  const fetchMethods = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/parent/payment-methods')
    const data = await res.json()
    setMethods(data.paymentMethods ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMethods() }, [fetchMethods])

  async function handleRemove(pmId: string) {
    setActionError('')
    const res = await fetch('/api/parent/payment-methods', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: pmId }),
    })
    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to remove card.')
    } else {
      fetchMethods()
    }
  }

  async function handleSetDefault(pmId: string) {
    setActionError('')
    const res = await fetch('/api/parent/payment-methods', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: pmId }),
    })
    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Failed to update default.')
    } else {
      fetchMethods()
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Payment method
      </h2>
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards saved.</p>
        ) : (
          <div className="space-y-2">
            {methods.map(pm => (
              <div key={pm.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {BRAND_LABEL[pm.brand] ?? pm.brand} •••• {pm.last4}
                    {pm.isDefault && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-normal">Default</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Expires {pm.expMonth}/{pm.expYear}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!pm.isDefault && (
                    <button
                      onClick={() => handleSetDefault(pm.id)}
                      title="Set as default"
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="relative group/del">
                    <button
                      onClick={() => handleRemove(pm.id)}
                      disabled={methods.length <= 1}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {methods.length <= 1 && (
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 rounded-lg bg-foreground px-3 py-2 text-xs text-background leading-snug opacity-0 group-hover/del:opacity-100 transition-opacity z-10">
                        You need to add another card before you can remove this one.
                        <div className="absolute top-full right-2.5 border-4 border-transparent border-t-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {actionError && <p className="text-xs text-destructive">{actionError}</p>}

        <AddCardSection onAdded={fetchMethods} />
      </div>
    </section>
  )
}
