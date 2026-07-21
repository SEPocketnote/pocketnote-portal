'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function SessionRow({ sessionId, index, scheduledAt, status }: {
  sessionId: string
  index: number
  scheduledAt: string
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function markComplete() {
    setLoading(true)
    await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    router.refresh()
    setLoading(false)
  }

  const date = new Date(scheduledAt)

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-16">Session {index}</span>
        <div>
          <p className="text-sm font-medium">{format(date, 'EEEE d MMMM yyyy')}</p>
          <p className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}>
          {status}
        </span>
        {status === 'scheduled' && (
          <button
            onClick={markComplete}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Saving…' : 'Mark complete'}
          </button>
        )}
      </div>
    </div>
  )
}
