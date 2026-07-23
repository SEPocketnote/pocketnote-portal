'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditTutorForm({
  tutorId,
  initialValues,
}: {
  tutorId: string
  initialValues: { legal_name: string; email: string; phone: string }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/tutors/${tutorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValues(initialValues)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors">
        Edit details
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6 mt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Edit details</h2>
      <div className="space-y-4 max-w-sm">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Full name</label>
          <input
            className="input"
            value={values.legal_name}
            onChange={e => setValues(v => ({ ...v, legal_name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Email</label>
          <input
            type="email"
            className="input"
            value={values.email}
            onChange={e => setValues(v => ({ ...v, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Phone</label>
          <input
            type="tel"
            className="input"
            value={values.phone}
            onChange={e => setValues(v => ({ ...v, phone: e.target.value }))}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="btn btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={cancel} disabled={saving}
            className="btn text-sm px-4 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
