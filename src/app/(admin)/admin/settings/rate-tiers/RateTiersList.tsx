'use client'

import { useState } from 'react'

type RateTier = {
  id: string
  name: string
  hourly_rate_cents: number
  description: string | null
  sort_order: number
  tutor_count?: number
}

export default function RateTiersList({ tiers }: { tiers: RateTier[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<RateTier>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [addName, setAddName] = useState('')
  const [addRate, setAddRate] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addSortOrder, setAddSortOrder] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function startEdit(tier: RateTier) {
    setEditingId(tier.id)
    setEditValues({
      name: tier.name,
      hourly_rate_cents: tier.hourly_rate_cents,
      description: tier.description ?? '',
      sort_order: tier.sort_order,
    })
    setError(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/rate-tiers/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: editValues.name,
        hourly_rate_cents: Math.round(parseFloat(String(editValues.hourly_rate_cents ?? 0)) * 100),
        description: editValues.description || null,
        sort_order: Number(editValues.sort_order ?? 0),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    setEditingId(null)
    window.location.reload()
  }

  async function deleteTier(id: string, name: string) {
    if (!confirm(`Delete tier "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/rate-tiers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Failed to delete')
      return
    }
    window.location.reload()
  }

  async function addTier() {
    setAdding(true)
    setAddError(null)
    if (!addName.trim() || !addRate) {
      setAddError('Name and rate are required.')
      setAdding(false)
      return
    }
    const res = await fetch('/api/admin/rate-tiers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: addName.trim(),
        hourly_rate_cents: Math.round(parseFloat(addRate) * 100),
        description: addDescription.trim() || null,
        sort_order: addSortOrder ? parseInt(addSortOrder) : 0,
      }),
    })
    setAdding(false)
    if (!res.ok) {
      const data = await res.json()
      setAddError(data.error ?? 'Failed to add')
      return
    }
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {tiers.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No rate tiers yet. Add one below.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate ($/hr)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutors</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tiers.map((tier) => (
                editingId === tier.id ? (
                  <tr key={tier.id} className="bg-muted/20">
                    <td className="px-4 py-3">
                      <input
                        className="input text-sm"
                        value={editValues.name ?? ''}
                        onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-sm w-28"
                        value={editValues.hourly_rate_cents !== undefined
                          ? (editValues.hourly_rate_cents / 100).toFixed(2)
                          : ''}
                        onChange={e => setEditValues(v => ({
                          ...v,
                          hourly_rate_cents: Math.round(parseFloat(e.target.value) * 100),
                        }))}
                      />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <input
                        className="input text-sm"
                        value={editValues.description ?? ''}
                        onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tier.tutor_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(tier.id)}
                          disabled={saving}
                          className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="btn text-xs px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </td>
                  </tr>
                ) : (
                  <tr key={tier.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{tier.name}</td>
                    <td className="px-4 py-3">${(tier.hourly_rate_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{tier.description || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tier.tutor_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(tier)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTier(tier.id, tier.name)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add tier form */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold mb-4">Add new tier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Name</label>
            <input
              className="input"
              placeholder="e.g. Standard"
              value={addName}
              onChange={e => setAddName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Hourly rate ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 45.00"
              className="input"
              value={addRate}
              onChange={e => setAddRate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
            <input
              className="input"
              placeholder="e.g. For tutors with 1–2 years experience"
              value={addDescription}
              onChange={e => setAddDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Sort order (optional)</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={addSortOrder}
              onChange={e => setAddSortOrder(e.target.value)}
            />
          </div>
        </div>
        {addError && <p className="text-xs text-red-600 mb-3">{addError}</p>}
        <button
          onClick={addTier}
          disabled={adding}
          className="btn btn-primary disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add tier'}
        </button>
      </div>
    </div>
  )
}
