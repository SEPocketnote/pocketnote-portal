'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, DollarSign } from 'lucide-react'
import { formatSessionDateFullYear, formatTime, toZonedDatetimeInput, toUtcFromZoned } from '@/lib/timezone'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
}

const METHOD_LABELS: Record<string, string> = {
  stripe_charge: 'Stripe charge ID',
  ndis: 'NDIS claim number',
  bank_transfer: 'Bank reference',
  cash: 'Notes',
  other: 'Notes',
}

type ProgressReport = {
  covered: string | null
  went_well: string | null
  needs_work: string | null
  next_session_plan: string | null
  notes: string | null
}

export default function SessionRow({ sessionId, index, scheduledAt, status, durationMinutes, timezone, rateCentsSnapshot, report }: {
  sessionId: string
  index: number
  scheduledAt: string
  status: string
  durationMinutes: number
  timezone: string
  rateCentsSnapshot: number | null
  report?: ProgressReport | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [datetimeValue, setDatetimeValue] = useState(toZonedDatetimeInput(scheduledAt, timezone))
  const [statusValue, setStatusValue] = useState(status)
  const [durationValue, setDurationValue] = useState(String(durationMinutes ?? 60))

  // Payment form state
  const defaultAmountDollars = rateCentsSnapshot
    ? ((rateCentsSnapshot * durationMinutes) / 60 / 100).toFixed(2)
    : ''
  const [payMethod, setPayMethod] = useState('stripe_charge')
  const [payAmount, setPayAmount] = useState(defaultAmountDollars)
  const [payDate, setPayDate] = useState(scheduledAt.slice(0, 10))
  const [payRef, setPayRef] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  async function confirmCancel() {
    setCancelling(true)
    await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setCancelConfirm(false)
    setCancelling(false)
    router.refresh()
  }

  async function save() {
    setLoading(true)
    await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduled_at: toUtcFromZoned(datetimeValue, timezone).toISOString(),
        status: statusValue,
        duration_minutes: parseInt(durationValue),
      }),
    })
    setEditing(false)
    router.refresh()
    setLoading(false)
  }

  function cancelEdit() {
    setDatetimeValue(toZonedDatetimeInput(scheduledAt, timezone))
    setStatusValue(status)
    setDurationValue(String(durationMinutes ?? 60))
    setEditing(false)
  }

  async function recordPayment() {
    setPayError('')
    const amountCents = Math.round(parseFloat(payAmount) * 100)
    if (!payAmount || isNaN(amountCents) || amountCents <= 0) {
      setPayError('Enter a valid amount.')
      return
    }
    if (!payDate) {
      setPayError('Enter a payment date.')
      return
    }
    setPayLoading(true)
    const res = await fetch(`/api/admin/sessions/${sessionId}/payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: payMethod,
        amountCents,
        paidAt: payDate,
        reference: payRef || undefined,
      }),
    })
    setPayLoading(false)
    if (!res.ok) {
      setPayError('Failed to record payment.')
      return
    }
    setPayOpen(false)
    setPayRef('')
    router.refresh()
  }

  if (editing) {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-16">Session {index}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date & time</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={datetimeValue}
              onChange={e => setDatetimeValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Duration (min)</label>
            <input
              type="number"
              min="15"
              step="15"
              className="input text-sm"
              value={durationValue}
              onChange={e => setDurationValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select
              className="input text-sm"
              value={statusValue}
              onChange={e => setStatusValue(e.target.value)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancelEdit} disabled={loading}
            className="btn text-xs px-3 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground w-16">Session {index}</span>
          <div>
            <p className="text-sm font-medium">{formatSessionDateFullYear(scheduledAt, timezone)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(scheduledAt, timezone)} · {durationMinutes} min</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <button
              onClick={() => setNotesOpen(o => !o)}
              title="View progress report"
              className={`transition-colors ${notesOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => { setPayOpen(o => !o); setPayError('') }}
            title="Record payment"
            className={`transition-colors ${payOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}>
            {status}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Edit
          </button>
          {status === 'scheduled' && (
            cancelConfirm ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Cancel session?</span>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="text-destructive font-medium hover:underline disabled:opacity-50"
                >
                  {cancelling ? '…' : 'Yes'}
                </button>
                <button onClick={() => setCancelConfirm(false)} className="text-muted-foreground hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                title="Cancel session"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Record payment inline form */}
      {payOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Record payment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Method</label>
              <select
                className="input text-sm"
                value={payMethod}
                onChange={e => { setPayMethod(e.target.value); setPayRef('') }}
              >
                <option value="stripe_charge">Stripe</option>
                <option value="ndis">NDIS</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input text-sm"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date paid</label>
              <input
                type="date"
                className="input text-sm"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{METHOD_LABELS[payMethod] ?? 'Reference'}</label>
              <input
                type="text"
                className="input text-sm"
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
                placeholder={payMethod === 'stripe_charge' ? 'ch_...' : payMethod === 'ndis' ? 'Claim number' : 'Optional'}
              />
            </div>
          </div>
          {payError && <p className="text-xs text-destructive">{payError}</p>}
          <div className="flex gap-2">
            <button
              onClick={recordPayment}
              disabled={payLoading}
              className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {payLoading ? 'Saving…' : 'Record payment'}
            </button>
            <button
              onClick={() => { setPayOpen(false); setPayError('') }}
              className="btn text-xs px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress report notes */}
      {report && notesOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-border bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 mb-2">Progress report</p>
          {[
            ['Covered', report.covered],
            ['Went well', report.went_well],
            ['Needs work', report.needs_work],
            ['Next session plan', report.next_session_plan],
            ['Notes', report.notes],
          ].map(([label, value]) =>
            value ? (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm">{value}</p>
              </div>
            ) : null
          )}
        </div>
      )}
    </>
  )
}
