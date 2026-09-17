'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

export default function ParentRateEditor({
  bookingId,
  initialRateCents,
}: {
  bookingId: string
  initialRateCents: number | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(
    initialRateCents != null ? (initialRateCents / 100).toFixed(2) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    const cents = value ? Math.round(parseFloat(value) * 100) : null
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parentRateCents: cents }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
      setLoading(false)
      return
    }
    setEditing(false)
    setLoading(false)
    router.refresh()
  }

  function handleCancel() {
    setValue(initialRateCents != null ? (initialRateCents / 100).toFixed(2) : '')
    setEditing(false)
    setError('')
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">
          {initialRateCents != null
            ? `$${(initialRateCents / 100).toFixed(2)}/hr`
            : <span className="text-muted-foreground font-normal">Not set</span>}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Edit rate"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <input
          type="number"
          min={0}
          step={0.01}
          autoFocus
          className="input pl-6 w-28 h-8 text-sm"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
        />
      </div>
      <span className="text-sm text-muted-foreground">/hr</span>
      <button onClick={handleSave} disabled={loading}
        className="text-green-600 hover:text-green-700 disabled:opacity-50">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={handleCancel} disabled={loading}
        className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
      {error && <p className="text-xs text-destructive w-full">{error}</p>}
    </div>
  )
}
