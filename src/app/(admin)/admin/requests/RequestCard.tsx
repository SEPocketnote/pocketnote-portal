'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toZonedDatetimeInput, toUtcFromZoned } from '@/lib/timezone'
import { format } from 'date-fns'

export default function RequestCard({
  req,
  tz,
  sessionDate,
  sessionTime,
}: {
  req: any
  tz: string
  sessionDate: string
  sessionTime: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [newDatetime, setNewDatetime] = useState(
    toZonedDatetimeInput(req.sessions?.scheduled_at, tz)
  )
  const [rejectOpen, setRejectOpen] = useState(false)

  const isReschedule = req.request_type === 'reschedule'
  const parent = req.parents as any
  const student = req.sessions?.bookings?.students?.name ?? '—'
  const tutorRaw = req.sessions?.bookings?.tutors
  const tutor = (tutorRaw as any)?.preferred_name?.trim() || (tutorRaw as any)?.legal_name ?? '—'
  const bookingId = req.sessions?.bookings?.id

  async function resolve(action: 'approve' | 'reject') {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string | undefined> = { action, adminNote: adminNote || undefined }
      if (action === 'approve' && isReschedule) {
        body.newDatetime = toUtcFromZoned(newDatetime, tz).toISOString()
      }
      const res = await fetch(`/api/admin/session-change-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const proposedLabel = req.proposed_datetime
    ? format(new Date(req.proposed_datetime), 'd MMM yyyy h:mm a')
    : null

  return (
    <div className="bg-white rounded-lg border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              isReschedule ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {isReschedule ? 'Reschedule' : 'Cancellation'}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(req.created_at), 'd MMM yyyy · h:mm a')}
            </span>
          </div>
          <p className="font-medium">{parent?.name} · {student}</p>
          <p className="text-sm text-muted-foreground">with {tutor}</p>
        </div>
        {bookingId && (
          <a href={`/admin/bookings/${bookingId}`} className="text-xs text-primary hover:underline shrink-0">
            View enrolment →
          </a>
        )}
      </div>

      {/* Session info */}
      <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Session</p>
        <p><span className="text-muted-foreground">Date:</span> {sessionDate} at {sessionTime}</p>
        {proposedLabel && (
          <p><span className="text-muted-foreground">Proposed new time:</span> {proposedLabel}</p>
        )}
        {req.parent_note && (
          <p><span className="text-muted-foreground">Parent note:</span> {req.parent_note}</p>
        )}
      </div>

      {/* Actions */}
      {!rejectOpen ? (
        <div className="space-y-3">
          {isReschedule && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                New session date & time <span className="text-muted-foreground">(tutor's timezone)</span>
              </label>
              <input
                type="datetime-local"
                className="input text-sm max-w-xs"
                value={newDatetime}
                onChange={e => setNewDatetime(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Note to parent (optional)</label>
            <input
              type="text"
              className="input text-sm"
              placeholder="e.g. Rescheduled to the time you requested…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => resolve('approve')}
              disabled={saving}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isReschedule ? 'Approve & reschedule' : 'Approve cancellation'}
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={saving}
              className="btn text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
          <p className="text-sm font-medium text-red-700">Reject this request</p>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Reason for parent (optional)</label>
            <input
              type="text"
              className="input text-sm w-full"
              placeholder="e.g. Too close to the session time…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => resolve('reject')}
              disabled={saving}
              className="btn text-sm px-4 py-2 bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm reject'}
            </button>
            <button
              onClick={() => { setRejectOpen(false); setAdminNote('') }}
              className="btn text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
