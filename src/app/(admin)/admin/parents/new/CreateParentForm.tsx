'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateParentForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', stripe_customer_id: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/parents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          stripe_customer_id: form.stripe_customer_id || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create parent')
      router.push(`/admin/parents/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
        <input
          type="text"
          className="input"
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email <span className="text-destructive">*</span></label>
        <input
          type="email"
          className="input"
          required
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          type="tel"
          className="input"
          placeholder="e.g. 0412 345 678"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Existing Stripe customer ID</label>
        <input
          type="text"
          className="input font-mono text-sm"
          placeholder="cus_…"
          value={form.stripe_customer_id}
          onChange={e => setForm({ ...form, stripe_customer_id: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave blank to create a new Stripe customer automatically. Use this for existing customers (Matt, Rach, Mase).
        </p>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground">
        No invite email will be sent. To give this parent portal access later, use the <strong>Send invite</strong> button on their profile.
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create parent'}
        </button>
        <a
          href="/admin/parents"
          className="px-4 py-2.5 rounded-md text-sm font-medium border border-border hover:bg-muted/40 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
