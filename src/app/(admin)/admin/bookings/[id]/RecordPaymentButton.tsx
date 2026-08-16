'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, X } from 'lucide-react'

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card_manual', label: 'Card (manual)' },
  { value: 'other', label: 'Other' },
]

export default function RecordPaymentButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('bank_transfer')
  const [notes, setNotes] = useState('')

  function reset() {
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setMethod('bank_transfer')
    setNotes('')
    setOpen(false)
  }

  async function save() {
    if (!amount || !date) return
    setSaving(true)
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, amount_dollars: amount, paid_at: date, method, notes }),
    })
    setSaving(false)
    if (res.ok) {
      reset()
      router.refresh()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        Record payment
      </button>
    )
  }

  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Record manual payment</p>
        <button onClick={reset} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Amount ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="input text-sm"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date paid</label>
          <input
            type="date"
            className="input text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Method</label>
        <select className="input text-sm" value={method} onChange={e => setMethod(e.target.value)}>
          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
        <input
          type="text"
          placeholder="e.g. term 3 payment"
          className="input text-sm"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !amount || !date}
          className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save payment'}
        </button>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}
