'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnrolmentActions({
  bookingId,
  currentTutorId,
  tutors,
  currentStatus,
  futureSessionTime,
  timezone,
}: {
  bookingId: string
  currentTutorId: string
  tutors: { id: string; legal_name: string }[]
  currentStatus: string
  futureSessionTime: string | null
  timezone: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Cancel enrolment
  const [cancelConfirm, setCancelConfirm] = useState(false)

  // Reassign tutor
  const [reassignOpen, setReassignOpen] = useState(false)
  const [newTutorId, setNewTutorId] = useState(currentTutorId)

  // Update future session time
  const [timeOpen, setTimeOpen] = useState(false)
  const [newTime, setNewTime] = useState(futureSessionTime ?? '')

  async function patch(payload: Record<string, unknown>) {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      return false
    }
    router.refresh()
    return true
  }

  async function handleCancelEnrolment() {
    const ok = await patch({ action: 'cancel_enrolment' })
    if (ok) setCancelConfirm(false)
  }

  async function handleReassign() {
    if (!newTutorId || newTutorId === currentTutorId) { setReassignOpen(false); return }
    const ok = await patch({ tutorId: newTutorId })
    if (ok) setReassignOpen(false)
  }

  async function handleUpdateTime() {
    if (!newTime) return
    const ok = await patch({ futureSessionTime: newTime, timezone })
    if (ok) setTimeOpen(false)
  }

  if (currentStatus === 'cancelled' || currentStatus === 'completed') return null

  return (
    <section className="bg-white rounded-lg border border-border p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolment actions</h2>

      <div className="space-y-3">

        {/* Update future session time */}
        {!timeOpen ? (
          <button
            onClick={() => setTimeOpen(true)}
            className="btn text-sm px-4 py-2 w-full text-left"
          >
            Edit future session time
          </button>
        ) : (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Update time for all upcoming sessions</p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">New session time (local time)</label>
              <input
                type="time"
                className="input text-sm w-40"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdateTime} disabled={saving || !newTime}
                className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {saving ? 'Updating…' : 'Update all upcoming'}
              </button>
              <button onClick={() => setTimeOpen(false)} className="btn text-sm px-4 py-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Reassign tutor */}
        {!reassignOpen ? (
          <button
            onClick={() => setReassignOpen(true)}
            className="btn text-sm px-4 py-2 w-full text-left"
          >
            Reassign tutor
          </button>
        ) : (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Reassign to a different tutor</p>
            <select
              className="input text-sm"
              value={newTutorId}
              onChange={e => setNewTutorId(e.target.value)}
            >
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.legal_name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={handleReassign} disabled={saving}
                className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm reassign'}
              </button>
              <button onClick={() => { setReassignOpen(false); setNewTutorId(currentTutorId) }}
                className="btn text-sm px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cancel enrolment */}
        {!cancelConfirm ? (
          <button
            onClick={() => setCancelConfirm(true)}
            disabled={saving}
            className="btn text-sm px-4 py-2 w-full text-left text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel enrolment
          </button>
        ) : (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
            <p className="text-sm font-medium text-red-700">Cancel this enrolment?</p>
            <p className="text-xs text-red-600">All upcoming sessions will be cancelled. This cannot be undone easily.</p>
            <div className="flex gap-2">
              <button onClick={handleCancelEnrolment} disabled={saving}
                className="btn text-sm px-4 py-2 bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Cancelling…' : 'Yes, cancel enrolment'}
              </button>
              <button onClick={() => setCancelConfirm(false)} className="btn text-sm px-4 py-2">Keep</button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}
