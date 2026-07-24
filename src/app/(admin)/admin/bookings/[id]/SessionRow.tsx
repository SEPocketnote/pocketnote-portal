'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SessionRow({ sessionId, index, scheduledAt, status, durationMinutes }: {
  sessionId: string
  index: number
  scheduledAt: string
  status: string
  durationMinutes: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [datetimeValue, setDatetimeValue] = useState(toLocalDatetimeValue(scheduledAt))
  const [statusValue, setStatusValue] = useState(status)
  const [durationValue, setDurationValue] = useState(String(durationMinutes ?? 60))

  async function save() {
    setLoading(true)
    await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduled_at: new Date(datetimeValue).toISOString(),
        status: statusValue,
        duration_minutes: parseInt(durationValue),
      }),
    })
    setEditing(false)
    router.refresh()
    setLoading(false)
  }

  function cancel() {
    setDatetimeValue(toLocalDatetimeValue(scheduledAt))
    setStatusValue(status)
    setDurationValue(String(durationMinutes ?? 60))
    setEditing(false)
  }

  const date = new Date(scheduledAt)

  if (editing) {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-16">Session {index}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date & time</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={datetimeValue}
              onChange={e => setDatetimeValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Duration (min)</label>
            <input
              type="number"
              min="15"
              step="15"
              className="input text-sm"
              value={durationValue}
              onChange={e => setDurationValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select
              className="input text-sm"
              value={statusValue}
              onChange={e => setStatusValue(e.target.value)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel} disabled={loading}
            className="btn text-xs px-3 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-16">Session {index}</span>
        <div>
          <p className="text-sm font-medium">{format(date, 'EEEE d MMMM yyyy')}</p>
          <p className="text-xs text-muted-foreground">{format(date, 'h:mm a')} · {durationMinutes} min</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}>
          {status}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Edit
        </button>
      </div>
    </div>
  )
}
