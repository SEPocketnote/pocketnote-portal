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

export default function AvailabilityGrid({ initialSlots }: { initialSlots: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [adding, setAdding] = useState<Record<number, boolean>>({})
  const [form, setForm] = useState<Record<number, { start: string; end: string }>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<number, string>>({})

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
      setSlots(s => [...s, data.slot].sort((a, b) =>
        a.day_of_week !== b.day_of_week
          ? a.day_of_week - b.day_of_week
          : a.start_time.localeCompare(b.start_time)
      ))
      setAdding(a => ({ ...a, [day]: false }))
    } catch (err: any) {
      setError(e => ({ ...e, [day]: err.message }))
    } finally {
      setSaving(s => ({ ...s, [day]: false }))
    }
  }

  async function handleDelete(slotId: string) {
    setDeleting(d => ({ ...d, [slotId]: true }))
    await fetch(`/api/tutor/availability/${slotId}`, { method: 'DELETE' })
    setSlots(s => s.filter(sl => sl.id !== slotId))
    setDeleting(d => ({ ...d, [slotId]: false }))
  }

  return (
    <div className="bg-white rounded-lg border border-border divide-y divide-border">
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
  )
}
