'use client'

import { useState } from 'react'

const DAYS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
]

type Slot = { id: string; day_of_week: number; start_time: string; end_time: string }

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function AvailabilityGrid({
  initialSlots,
  onSlotsChange,
}: {
  initialSlots: Slot[]
  onSlotsChange?: (count: number) => void
}) {
  type ConflictEntry = { studentName: string; sessionDate: string }

  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [adding, setAdding] = useState<Record<number, boolean>>({})
  const [form, setForm] = useState<Record<number, { start: string; end: string }>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<number, string>>({})
  const [conflictWarning, setConflictWarning] = useState<ConflictEntry[] | null>(null)

  function openAdd(day: number) {
    setAdding(a => ({ ...a, [day]: true }))
    setForm(f => ({ ...f, [day]: { start: '09:00', end: '11:00' } }))
    setError(e => ({ ...e, [day]: '' }))
  }

  function cancelAdd(day: number) {
    setAdding(a => ({ ...a, [day]: false }))
  }

  async function handleAdd(day: number) {
    const { start, end } = form[day] ?? {}
    if (!start || !end) return
    if (start >= end) {
      setError(e => ({ ...e, [day]: 'End time must be after start time' }))
      return
    }
    setSaving(s => ({ ...s, [day]: true }))
    setError(e => ({ ...e, [day]: '' }))
    try {
      const res = await fetch('/api/tutor/availability', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ day_of_week: day, start_time: start, end_time: end }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSlots(s => {
        const next = [...s, data.slot].sort((a, b) =>
          a.day_of_week !== b.day_of_week
            ? a.day_of_week - b.day_of_week
            : a.start_time.localeCompare(b.start_time)
        )
        onSlotsChange?.(next.length)
        return next
      })
      setAdding(a => ({ ...a, [day]: false }))
    } catch (err: any) {
      setError(e => ({ ...e, [day]: err.message }))
    } finally {
      setSaving(s => ({ ...s, [day]: false }))
    }
  }

  async function handleDelete(slotId: string) {
    setDeleting(d => ({ ...d, [slotId]: true }))
    setConflictWarning(null)
    const res = await fetch(`/api/tutor/availability/${slotId}`, { method: 'DELETE' })
    const data = await res.json()
    setSlots(s => {
      const next = s.filter(sl => sl.id !== slotId)
      onSlotsChange?.(next.length)
      return next
    })
    if (data.conflicts?.length > 0) setConflictWarning(data.conflicts)
    setDeleting(d => ({ ...d, [slotId]: false }))
  }

  return (
    <div className="space-y-4">
    {conflictWarning && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              This slot overlapped with upcoming session{conflictWarning.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 mt-0.5 mb-3">
              The Pocketnote team has been notified and will follow up. These sessions are still scheduled.
            </p>
            <ul className="space-y-1">
              {conflictWarning.map((c, i) => (
                <li key={i} className="text-sm text-amber-800">
                  <span className="font-medium">{c.studentName}</span>
                  <span className="text-amber-600"> · {c.sessionDate}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setConflictWarning(null)}
            className="text-amber-500 hover:text-amber-700 shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    )}
    <div className="bg-white rounded-2xl shadow-card divide-y divide-border/50">
      {DAYS.map(({ label, value: day }) => {
        const daySlots = slots.filter(s => s.day_of_week === day)
        const isAdding = adding[day]

        return (
          <div key={day} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium w-24 pt-1 shrink-0">{label}</span>

              <div className="flex-1 space-y-2">
                {/* Existing slots */}
                {daySlots.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map(slot => (
                      <span
                        key={slot.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-primary rounded-full text-sm"
                      >
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deleting[slot.id]}
                          className="text-primary/60 hover:text-primary transition-colors disabled:opacity-40 leading-none"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add slot form */}
                {isAdding && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      className="input w-32 text-sm"
                      value={form[day]?.start ?? ''}
                      onChange={e => setForm(f => ({ ...f, [day]: { ...f[day], start: e.target.value } }))}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="time"
                      className="input w-32 text-sm"
                      value={form[day]?.end ?? ''}
                      onChange={e => setForm(f => ({ ...f, [day]: { ...f[day], end: e.target.value } }))}
                    />
                    <button
                      onClick={() => handleAdd(day)}
                      disabled={saving[day]}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                      {saving[day] ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => cancelAdd(day)}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    {error[day] && (
                      <p className="w-full text-xs text-destructive">{error[day]}</p>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {daySlots.length === 0 && !isAdding && (
                  <span className="text-sm text-muted-foreground">Not available</span>
                )}
              </div>

              {!isAdding && (
                <button
                  onClick={() => openAdd(day)}
                  className="text-xs text-primary hover:underline shrink-0 pt-1"
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
    </div>
  )
}
