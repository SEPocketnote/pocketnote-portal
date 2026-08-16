'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function AddressRequestCard({ req }: { req: any }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const parent = req.parents as any

  async function resolve(action: 'approve' | 'reject') {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/address-change-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, adminNote: rejectNote || undefined }),
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

  return (
    <div className="bg-white rounded-lg border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Address update
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(req.created_at), 'd MMM yyyy · h:mm a')}
            </span>
          </div>
          <p className="font-medium">{parent?.name}</p>
          <p className="text-sm text-muted-foreground">{parent?.email}</p>
        </div>
        <a href={`/admin/parents/${parent?.id}`} className="text-xs text-primary hover:underline shrink-0">
          View profile →
        </a>
      </div>

      <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm space-y-2">
        {req.current_address && (
          <p><span className="text-muted-foreground">Current:</span> {req.current_address}</p>
        )}
        <p><span className="text-muted-foreground">Proposed:</span> <strong>{req.proposed_address}</strong></p>
        {req.parent_note && (
          <p><span className="text-muted-foreground">Note:</span> {req.parent_note}</p>
        )}
      </div>

      {!rejectOpen ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => resolve('approve')}
              disabled={saving}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Approve'}
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
              placeholder="e.g. Please call us to discuss…"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
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
              onClick={() => { setRejectOpen(false); setRejectNote('') }}
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
