'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccountForm({ name, email, phone }: {
  name: string
  email: string
  phone: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name, phone })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/parent/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Details saved')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input type="text" className="input" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <p className="text-sm py-2 px-3 bg-muted/40 rounded-md text-foreground">{email}</p>
        <p className="text-xs text-muted-foreground mt-1">To change your email, contact us at hello@pocketnote.com.au</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input type="tel" className="input" value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button type="submit" disabled={saving}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
