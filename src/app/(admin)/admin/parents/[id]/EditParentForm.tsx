'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditParentForm({
  parentId,
  initialValues,
}: {
  parentId: string
  initialValues: { name: string; email: string; phone: string }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/parents/${parentId}`, {
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

  return (
    <section className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Full name</label>
            <input
              className="input"
              value={values.name}
              onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
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
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Full name" value={values.name} />
          <Info label="Email" value={values.email} />
          <Info label="Phone" value={values.phone || null} />
        </dl>
      )}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
