'use client'

import { useState } from 'react'
import { formatSessionDateFullYear, formatTime } from '@/lib/timezone'

type Session = {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  student_name: string | null
  rate_cents: number
}

export default function InvoiceForm({
  sessions,
  timezone,
}: {
  sessions: Session[]
  timezone: string
}) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group sessions by rate to detect mixed-rate invoices
  const rateGroups = sessions.reduce<Map<number, Session[]>>((map, s) => {
    const list = map.get(s.rate_cents) ?? []
    list.push(s)
    map.set(s.rate_cents, list)
    return map
  }, new Map())

  const isMixedRate = rateGroups.size > 1
  const totalCents = sessions.reduce(
    (sum, s) => sum + Math.round(((s.duration_minutes ?? 60) / 60) * s.rate_cents),
    0
  )
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 60), 0)
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
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-[#F5F4F2]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions included</p>
        </div>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{s.student_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSessionDateFullYear(s.scheduled_at, timezone)} · {formatTime(s.scheduled_at, timezone)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{s.duration_minutes ?? 60} min</span>
                {isMixedRate && (
                  <p className="text-xs text-muted-foreground">${(s.rate_cents / 100).toFixed(2)}/hr</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sessions</span>
            <span className="font-medium">{sessions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total time</span>
            <span className="font-medium">{hoursDisplay}</span>
          </div>
          {!isMixedRate && sessions[0] && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">${(sessions[0].rate_cents / 100).toFixed(2)}/hr</span>
            </div>
          )}
          {isMixedRate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rates</span>
              <div className="text-right">
                {[...rateGroups.entries()].map(([rate, list]) => (
                  <p key={rate} className="font-medium">
                    ${(rate / 100).toFixed(2)}/hr × {list.length} session{list.length !== 1 ? 's' : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
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
        <button onClick={submit} disabled={submitting} className="btn btn-primary disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit Invoice'}
        </button>
        <button type="button" onClick={() => { window.location.href = '/tutor/earnings' }} className="btn">Cancel</button>
      </div>
    </div>
  )
}
