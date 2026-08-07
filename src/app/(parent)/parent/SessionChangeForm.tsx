'use client'

import { useState } from 'react'

type RequestType = 'reschedule' | 'cancellation'

export default function SessionChangeForm({
  sessionId,
  bookingId,
  sessionLabel,
  hasPendingRequest,
}: {
  sessionId: string
  bookingId: string
  sessionLabel: string
  hasPendingRequest: boolean
}) {
  const [open, setOpen] = useState(false)
  const [requestType, setRequestType] = useState<RequestType>('reschedule')
  const [parentNote, setParentNote] = useState('')
  const [proposedDatetime, setProposedDatetime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(hasPendingRequest)
  const [error, setError] = useState('')

  if (done) {
    return (
      <span className="text-xs text-amber-600 font-medium">Request pending</span>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-primary underline"
      >
        Request change
      </button>
    )
  }

  async function handleSubmit() {
    if (!parentNote.trim() && !proposedDatetime) {
      setError('Please add a note or proposed time.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/parent/session-change-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          bookingId,
          requestType,
          parentNote: parentNote.trim() || undefined,
          proposedDatetime: proposedDatetime || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit request')
        return
      }
      setDone(true)
      setOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 border border-border rounded-lg p-4 bg-muted/20 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Request a change — {sessionLabel}
      </p>

      {/* Type */}
      <div className="flex gap-2">
        {(['reschedule', 'cancellation'] as RequestType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setRequestType(t)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors capitalize ${
              requestType === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white border-border hover:border-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Proposed time (reschedule only) */}
      {requestType === 'reschedule' && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Proposed new time (optional)</label>
          <input
            type="datetime-local"
            className="input text-sm max-w-xs"
            value={proposedDatetime}
            onChange={e => setProposedDatetime(e.target.value)}
          />
        </div>
      )}

      {/* Note */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">
          {requestType === 'reschedule' ? 'Reason or additional details' : 'Reason for cancellation'}
        </label>
        <textarea
          className="input text-sm w-full min-h-[72px] resize-none"
          placeholder={
            requestType === 'reschedule'
              ? "e.g. We have a school event that week — any day the following week works."
              : "e.g. We're going on holidays and won't be back until the 20th."
          }
          value={parentNote}
          onChange={e => { setParentNote(e.target.value); setError('') }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn btn-primary text-xs px-4 py-2 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(''); setParentNote(''); setProposedDatetime('') }}
          className="btn text-xs px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
