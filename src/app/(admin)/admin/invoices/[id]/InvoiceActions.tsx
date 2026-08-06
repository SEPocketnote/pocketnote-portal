'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'submitted' | 'approved' | 'paid' | 'rejected'

export default function InvoiceActions({
  invoiceId,
  status,
  adminNotes: initialAdminNotes,
}: {
  invoiceId: string
  status: Status
  adminNotes: string
}) {
  const router = useRouter()
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes)
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rejection flow
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  // Revert paid flow
  const [confirmRevert, setConfirmRevert] = useState(false)

  async function update(payload: Record<string, string | null>) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to update')
      return false
    }
    router.refresh()
    return true
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required before rejecting.')
      return
    }
    const ok = await update({ status: 'rejected', admin_notes: rejectReason.trim() })
    if (ok) {
      setRejectOpen(false)
      setRejectReason('')
    }
  }

  return (
    <section className="bg-white rounded-lg border border-border p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin actions</h2>

      {/* Status actions */}
      <div className="space-y-3">

        {/* submitted → approve or reject */}
        {status === 'submitted' && !rejectOpen && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => update({ status: 'approved', admin_notes: adminNotes })}
              disabled={saving}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={saving}
              className="btn text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}

        {/* approved → mark paid or reject */}
        {status === 'approved' && !rejectOpen && (
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Paid on</label>
              <input
                type="date"
                className="input text-sm"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
              />
            </div>
            <button
              onClick={() => update({ status: 'paid', paid_at: new Date(paidAt).toISOString(), admin_notes: adminNotes })}
              disabled={saving}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              Mark Paid
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={saving}
              className="btn text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}

        {/* Reject panel — mandatory reason */}
        {rejectOpen && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
            <p className="text-sm font-medium text-red-700">Reject invoice — reason required</p>
            <div>
              <textarea
                className="input min-h-[80px] resize-y w-full text-sm"
                placeholder="Explain why this invoice is being rejected (visible to the tutor)…"
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setRejectError('') }}
              />
              {rejectError && <p className="text-xs text-red-600 mt-1">{rejectError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={saving}
                className="btn text-sm px-4 py-2 bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Rejecting…' : 'Confirm reject'}
              </button>
              <button
                onClick={() => { setRejectOpen(false); setRejectReason(''); setRejectError('') }}
                className="btn text-sm px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* paid → revert */}
        {status === 'paid' && (
          <div>
            {confirmRevert ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Revert to approved?</span>
                <button
                  onClick={async () => {
                    await update({ status: 'approved', paid_at: null })
                    setConfirmRevert(false)
                  }}
                  disabled={saving}
                  className="text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Yes, revert
                </button>
                <button onClick={() => setConfirmRevert(false)} className="text-muted-foreground hover:underline">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-sm text-green-700 font-medium">Invoice is marked as paid.</p>
                <button
                  onClick={() => setConfirmRevert(true)}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Revert to approved
                </button>
              </div>
            )}
          </div>
        )}

        {/* rejected → reopen */}
        {status === 'rejected' && (
          <button
            onClick={() => update({ status: 'submitted', admin_notes: adminNotes })}
            disabled={saving}
            className="btn text-sm px-4 py-2 disabled:opacity-50"
          >
            Reopen (set to submitted)
          </button>
        )}
      </div>

      {/* Admin notes */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Admin notes (internal)</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="Internal notes visible to admins only…"
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
        />
        <button
          onClick={() => update({ admin_notes: adminNotes })}
          disabled={saving}
          className="btn text-xs px-3 py-1.5 mt-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  )
}
