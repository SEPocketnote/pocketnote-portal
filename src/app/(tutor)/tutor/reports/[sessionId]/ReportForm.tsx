'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const RATINGS = [
  { value: 1, label: 'Struggling' },
  { value: 2, label: 'Below average' },
  { value: 3, label: 'On track' },
  { value: 4, label: 'Good progress' },
  { value: 5, label: 'Excellent' },
]

type Props = {
  sessionId: string
  existing?: {
    covered?: string | null
    went_well?: string | null
    needs_work?: string | null
    next_session_plan?: string | null
    notes?: string | null
    internal_rating?: number | null
  } | null
}

export default function ReportForm({ sessionId, existing }: Props) {
  const router = useRouter()
  const [values, setValues] = useState({
    covered: existing?.covered ?? '',
    went_well: existing?.went_well ?? '',
    needs_work: existing?.needs_work ?? '',
    next_session_plan: existing?.next_session_plan ?? '',
    notes: existing?.notes ?? '',
    internal_rating: existing?.internal_rating ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string | number) {
    setValues(v => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/tutor/progress-reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        ...values,
        internal_rating: values.internal_rating || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    router.push('/tutor/students')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="What did you cover this session?">
        <textarea className="input min-h-[80px] resize-y" value={values.covered}
          onChange={e => set('covered', e.target.value)} />
      </Field>

      <Field label="What went well?">
        <textarea className="input min-h-[80px] resize-y" value={values.went_well}
          onChange={e => set('went_well', e.target.value)} />
      </Field>

      <Field label="Areas that need more work">
        <textarea className="input min-h-[80px] resize-y" value={values.needs_work}
          onChange={e => set('needs_work', e.target.value)} />
      </Field>

      <Field label="Plan for next session">
        <textarea className="input min-h-[80px] resize-y" value={values.next_session_plan}
          onChange={e => set('next_session_plan', e.target.value)} />
      </Field>

      <Field label="Additional notes (visible to parent)">
        <textarea className="input min-h-[60px] resize-y" value={values.notes}
          onChange={e => set('notes', e.target.value)} />
      </Field>

      <Field label="Session rating (private — not shown to parents)">
        <div className="flex gap-2 flex-wrap">
          {RATINGS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => set('internal_rating', values.internal_rating === r.value ? 0 : r.value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                values.internal_rating === r.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {r.value} · {r.label}
            </button>
          ))}
        </div>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="btn btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : existing ? 'Update report' : 'Submit report'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="btn">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
