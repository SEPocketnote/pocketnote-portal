'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Override = {
  id: string
  student_id: string
  student_name: string
  rate_cents: number
}

type Student = {
  id: string
  name: string
}

export default function StudentRateOverrides({
  tutorId,
  overrides,
  students,
}: {
  tutorId: string
  overrides: Override[]
  students: Student[]
}) {
  const router = useRouter()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [rateDollars, setRateDollars] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const availableStudents = students.filter(
    s => !overrides.find(o => o.student_id === s.id)
  )

  async function addOverride() {
    if (!selectedStudentId || !rateDollars) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/student-rate-overrides', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tutor_id: tutorId,
        student_id: selectedStudentId,
        rate_cents: Math.round(parseFloat(rateDollars) * 100),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    setSelectedStudentId('')
    setRateDollars('')
    router.refresh()
  }

  async function removeOverride(studentId: string) {
    setRemovingId(studentId)
    await fetch('/api/admin/student-rate-overrides', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tutor_id: tutorId, student_id: studentId }),
    })
    setRemovingId(null)
    router.refresh()
  }

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Student rate overrides
      </h2>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {overrides.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No custom rates set. All students use the tutor&apos;s standard mode rate.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {overrides.map(o => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{o.student_name}</p>
                  <p className="text-xs text-muted-foreground">Flat rate — any mode</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">${(o.rate_cents / 100).toFixed(2)}/hr</span>
                  <button
                    onClick={() => removeOverride(o.student_id)}
                    disabled={removingId === o.student_id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableStudents.length > 0 && (
          <div className="border-t border-border px-4 py-4 bg-muted/20 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add custom rate</p>
            <div className="flex gap-2 flex-wrap">
              <select
                className="input text-sm flex-1 min-w-[160px]"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select student…</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="$/hr"
                className="input text-sm w-28"
                value={rateDollars}
                onChange={e => setRateDollars(e.target.value)}
              />
              <button
                onClick={addOverride}
                disabled={saving || !selectedStudentId || !rateDollars}
                className="btn btn-primary text-sm px-4 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add'}
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
