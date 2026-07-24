'use client'

import { useState } from 'react'
import { format } from 'date-fns'

type Session = {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  student_name: string | null
}

export default function InvoiceForm({
  sessions,
  hourlyRateCents,
}: {
  sessions: Session[]
  hourlyRateCents: number
}) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 60), 0)
  const totalCents = Math.round((totalMinutes / 60) * hourlyRateCents)
  const hoursDisplay = `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ''}`

  async function submit() {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/tutor/invoices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session_ids: sessions.map(s => s.id),
        notes: notes.trim() || undefined,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to submit invoice. Please try again.')
      return
    }
    window.location.href = '/tutor/earnings'
  }

  return (
    <div className="space-y-6">
      {/* Session list */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions included</p>
        </div>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{s.student_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{s.duration_minutes ?? 60} min</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-border p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sessions</span>
            <span className="font-medium">{sessions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total time</span>
            <span className="font-medium">{hoursDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium">${(hourlyRateCents / 100).toFixed(2)}/hr</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="font-semibold">Total</span>
            <span className="font-semibold text-lg">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="Any notes for admin regarding this invoice…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Invoice'}
        </button>
        <a href="/tutor/earnings" className="btn">
          Cancel
        </a>
      </div>
    </div>
  )
}
