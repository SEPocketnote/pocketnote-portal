'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkCompleteButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    const res = await fetch(`/api/tutor/sessions/${sessionId}`, { method: 'PATCH' })
    if (res.ok) {
      router.push(`/tutor/reports/${sessionId}`)
    } else {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Done?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-primary font-medium hover:underline disabled:opacity-50"
        >
          {loading ? '…' : 'Yes'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:underline">
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
    >
      Mark complete
    </button>
  )
}
