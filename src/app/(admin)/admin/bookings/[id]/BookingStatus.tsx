'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700',
}

export default function BookingStatus({ bookingId, currentStatus }: {
  bookingId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setSaving(true)
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setStatus(next)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? ''}`}>
        {status}
      </span>
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="text-xs border border-border rounded-md px-2 py-1 bg-white text-foreground disabled:opacity-50"
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
    </div>
  )
}
