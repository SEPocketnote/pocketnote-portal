'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelAllSessions({ bookingId, scheduledCount }: { bookingId: string; scheduledCount: number }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  if (scheduledCount === 0) return null

  async function handleCancel() {
    setLoading(true)
    await fetch(`/api/admin/bookings/${bookingId}/cancel-sessions`, { method: 'POST' })
    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Cancel all {scheduledCount} remaining sessions?</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-destructive font-medium hover:underline disabled:opacity-50"
        >
          {loading ? '…' : 'Yes, cancel all'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-muted-foreground hover:underline">
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-destructive hover:underline font-medium"
    >
      Cancel all remaining sessions ({scheduledCount})
    </button>
  )
}
