'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'

type Block = {
  id: string
  start_date: string
  end_date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
  notes: string | null
}

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

function formatBlock(b: Block) {
  const start = format(parseISO(b.start_date), 'd MMM yyyy')
  const end = format(parseISO(b.end_date), 'd MMM yyyy')
  const dateRange = start === end ? start : `${start} – ${end}`
  const time = b.is_all_day ? 'All day' : `${formatTime12(b.start_time!)} – ${formatTime12(b.end_time!)}`
  return `${dateRange} · ${time}`
}

export default function UnavailabilitySection() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    start_date: today,
    end_date: today,
    is_all_day: true,
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  })

  const fetchBlocks = useCallback(async () => {
    const res = await fetch('/api/tutor/unavailability')
    const data = await res.json()
    setBlocks(data.blocks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  function openForm() {
    setForm({ start_date: today, end_date: today, is_all_day: true, start_time: '09:00', end_time: '17:00', notes: '' })
    setError('')
    setAdding(true)
  }

  async function handleSave() {
    if (!form.start_date || !form.end_date) { setError('Please select a date range.'); return }
    if (!form.is_all_day && form.start_time >= form.end_time) { setError('End time must be after start time.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/tutor/unavailability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
    setBlocks(b => [...b, data.block].sort((a, z) => a.start_date.localeCompare(z.start_date)))
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/tutor/unavailability/${id}`, { method: 'DELETE' })
    setBlocks(b => b.filter(bl => bl.id !== id))
    setDeleting(null)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Temporary unavailability</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add holiday or one-off dates when you&apos;re unavailable.</p>
        </div>
        {!adding && (
          <button onClick={openForm}
            className="text-xs text-primary hover:underline font-medium shrink-0">
            + Add unavailability
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
              <input type="date" className="input text-sm" value={form.start_date}
                min={today}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: e.target.value > f.end_date ? e.target.value : f.end_date }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
              <input type="date" className="input text-sm" value={form.end_date}
                min={form.start_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_all_day}
              onChange={e => setForm(f => ({ ...f, is_all_day: e.target.checked }))}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm">All day</span>
          </label>

          {!form.is_all_day && (
            <div className="flex items-center gap-3">
              <input type="time" className="input w-32 text-sm" value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              <span className="text-sm text-muted-foreground">to</span>
              <input type="time" className="input w-32 text-sm" value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
            <input type="text" className="input text-sm" placeholder="e.g. Annual leave"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : blocks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card px-5 py-6 text-sm text-muted-foreground text-center">
          No temporary unavailability set.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card divide-y divide-border/50">
          {blocks.map(b => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium">{formatBlock(b)}</p>
                {b.notes && <p className="text-xs text-muted-foreground mt-0.5">{b.notes}</p>}
              </div>
              <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-40 pt-0.5">
                {deleting === b.id ? '…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
