'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoChargeToggle({
  parentId,
  initialValue,
}: {
  parentId: string
  initialValue: boolean
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setLoading(true)
    const res = await fetch(`/api/admin/parents/${parentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ auto_charge_enabled: next }),
    })
    if (!res.ok) {
      setEnabled(!next) // revert
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Auto-charge</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {enabled
            ? 'Sessions charged automatically on schedule'
            : 'Manual — admin triggers each charge'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
