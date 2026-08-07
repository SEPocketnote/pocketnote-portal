'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Accepts AU mobiles (04xx), landlines (02/03/07/08), and +61 international format
function validateAuPhone(value: string): boolean {
  const digits = value.replace(/[\s\-().]/g, '')
  return /^(\+?61[2-9]\d{8}|0[2-9]\d{8})$/.test(digits)
}

const AU_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA',  label: 'South Australia' },
  { value: 'WA',  label: 'Western Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT',  label: 'Northern Territory' },
]

export default function AccountForm({ name, email, phone, state }: {
  name: string
  email: string
  phone: string
  state: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [form, setForm] = useState({ name, phone, state })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhoneError('')
    if (form.phone && !validateAuPhone(form.phone)) {
      setPhoneError('Please enter a valid Australian phone number')
      return
    }
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
        <input type="tel" className="input" placeholder="e.g. 0412 345 678" value={form.phone}
          onChange={e => { setPhoneError(''); setForm({ ...form, phone: e.target.value }) }} />
        {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">State</label>
        <select className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
          <option value="">Select state…</option>
          {AU_STATES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">Used to show session times in your local timezone</p>
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
