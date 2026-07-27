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
      return
    }
    router.refresh()
  }

  return (
    <section className="bg-white rounded-lg border border-border p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin actions</h2>

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {status === 'submitted' && (
          <button
            onClick={() => update({ status: 'approved', admin_notes: adminNotes })}
            disabled={saving}
            className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {status === 'approved' && (
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
              onClick={() => {
                if (!confirm('Reject this invoice?')) return
                update({ status: 'rejected', admin_notes: adminNotes })
              }}
              disabled={saving}
              className="btn text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
        {status === 'submitted' && (
          <button
            onClick={() => {
              if (!confirm('Reject this invoice?')) return
              update({ status: 'rejected', admin_notes: adminNotes })
            }}
            disabled={saving}
            className="btn text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>
        )}
        {status === 'rejected' && (
          <button
            onClick={() => update({ status: 'submitted', admin_notes: adminNotes })}
            disabled={saving}
            className="btn text-sm px-4 py-2 disabled:opacity-50"
          >
            Reopen (set to submitted)
          </button>
        )}
        {status === 'paid' && (
          <p className="text-sm text-green-700 font-medium">Invoice is marked as paid.</p>
        )}
      </div>

      {/* Admin notes */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Admin notes</label>
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
