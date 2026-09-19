'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' }
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

interface Props {
  bookingId: string
  initialDayOfWeek: number | null
  initialTime: string | null
}

export default function PaymentDayEditor({ bookingId, initialDayOfWeek, initialTime }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initialDayOfWeek)
  const [time, setTime] = useState(initialTime ?? '18:00')
  const [saving, setSaving] = useState(false)

  function openEdit() {
    // Reset to current saved values before opening
    setDayOfWeek(initialDayOfWeek)
    setTime(initialTime ?? '18:00')
    setEditing(true)
  }

  function handleCancel() {
    setDayOfWeek(initialDayOfWeek)
    setTime(initialTime ?? '18:00')
    setEditing(false)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentDayOfWeek: dayOfWeek, paymentTime: time }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentDayOfWeek: null, paymentTime: null }),
      })
      if (res.ok) {
        setDayOfWeek(null)
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group">
        {initialDayOfWeek !== null ? (
          <span className="font-medium text-sm">
            {DAY_LABELS[initialDayOfWeek]} at {initialTime ?? ''}
          </span>
        ) : (
          <span className="text-muted-foreground font-normal text-sm">—</span>
        )}
        <button
          onClick={openEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          title="Edit"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        {DAY_ORDER.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDayOfWeek(d)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              dayOfWeek === d
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white text-foreground border-border hover:border-primary/50'
            }`}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          className="input text-sm py-1 w-28"
          value={time}
          onChange={e => setTime(e.target.value)}
        />
        <button
          onClick={save}
          disabled={saving || dayOfWeek === null}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={handleCancel} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        {initialDayOfWeek !== null && (
          <button onClick={clear} disabled={saving} className="text-xs text-red-500 hover:text-red-700 ml-auto disabled:opacity-50">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
