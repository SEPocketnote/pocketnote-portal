'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddressForm({
  currentAddress,
  hasPendingRequest,
}: {
  currentAddress: string | null
  hasPendingRequest: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [proposedAddress, setProposedAddress] = useState('')
  const [parentNote, setParentNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(hasPendingRequest)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!proposedAddress.trim()) {
      setError('Please enter the new address.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/parent/address-change-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          proposedAddress: proposedAddress.trim(),
          parentNote: parentNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit request')
        return
      }
      setDone(true)
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session address</h2>
        {done && (
          <span className="text-xs text-amber-600 font-medium">Update request pending</span>
        )}
      </div>

      {currentAddress ? (
        <p className="text-sm py-2 px-3 bg-muted/40 rounded-md">{currentAddress}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No address on file.</p>
      )}

      {!done && !open && (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-primary hover:underline"
        >
          {currentAddress ? 'Request address update' : 'Add session address'}
        </button>
      )}

      {open && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-sm font-medium mb-1">New address</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 12 Smith St, Bondi NSW 2026"
              value={proposedAddress}
              onChange={e => { setProposedAddress(e.target.value); setError('') }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              className="input min-h-[64px] resize-none text-sm"
              placeholder="e.g. Only for the Tuesday sessions, or applies to all bookings from next month."
              value={parentNote}
              onChange={e => setParentNote(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
            <button
              onClick={() => { setOpen(false); setProposedAddress(''); setParentNote(''); setError('') }}
              className="btn text-sm px-3 py-2"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Address updates are reviewed by our team before being applied. Your tutor will be notified once confirmed.
          </p>
        </div>
      )}
    </div>
  )
}
