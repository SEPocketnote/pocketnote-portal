'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type StudentRecord = {
  id: string
  name: string
  year_level: string | null
  subjects: string[]
}

const AU_YEAR_LEVELS = [
  'Kindergarten', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12',
]

function StudentForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: { name: string; year_level: string; subjects: string }
  onSave: (values: { name: string; year_level: string; subjectsText: string }) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [name, setName] = useState(initial.name)
  const [yearLevel, setYearLevel] = useState(initial.year_level)
  const [subjectsText, setSubjectsText] = useState(initial.subjects)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Student name" autoFocus />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Year level</label>
          <select className="input" value={yearLevel} onChange={e => setYearLevel(e.target.value)}>
            <option value="">—</option>
            {AU_YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Subjects (comma-separated)</label>
        <input className="input" value={subjectsText}
          onChange={e => setSubjectsText(e.target.value)}
          placeholder="e.g. Maths, English, Science" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ name, year_level: yearLevel, subjectsText })}
          disabled={saving || !name.trim()}
          className="btn btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn text-sm px-4 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function StudentManager({
  students: initialStudents,
  createUrl,
  updateUrlBase,
}: {
  students: StudentRecord[]
  createUrl: string
  updateUrlBase: string
}) {
  const router = useRouter()
  const [students, setStudents] = useState(initialStudents)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function subjectsToText(s: string[]) {
    return s.join(', ')
  }

  function textToSubjects(t: string) {
    return t.split(',').map(s => s.trim()).filter(Boolean)
  }

  async function handleUpdate(id: string, values: { name: string; year_level: string; subjectsText: string }) {
    setSaving(true)
    setError(null)
    const res = await fetch(`${updateUrlBase}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        year_level: values.year_level,
        subjects: textToSubjects(values.subjectsText),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      name: values.name,
      year_level: values.year_level || null,
      subjects: textToSubjects(values.subjectsText),
    } : s))
    setEditingId(null)
    router.refresh()
  }

  async function handleCreate(values: { name: string; year_level: string; subjectsText: string }) {
    setSaving(true)
    setError(null)
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        year_level: values.year_level,
        subjects: textToSubjects(values.subjectsText),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    const newStudent: StudentRecord = await res.json()
    setStudents(prev => [...prev, newStudent])
    setAddingNew(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {students.map(s => (
        <div key={s.id} className="bg-white rounded-2xl shadow-md p-4">
          {editingId === s.id ? (
            <StudentForm
              initial={{
                name: s.name,
                year_level: s.year_level ?? '',
                subjects: subjectsToText(s.subjects),
              }}
              onSave={vals => handleUpdate(s.id, vals)}
              onCancel={() => { setEditingId(null); setError(null) }}
              saving={saving}
              error={error}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[s.year_level, s.subjects.length ? s.subjects.join(', ') : null]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => { setEditingId(s.id); setAddingNew(false); setError(null) }}
                className="text-xs text-primary hover:underline shrink-0">
                Edit
              </button>
            </div>
          )}
        </div>
      ))}

      {addingNew ? (
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            New student
          </p>
          <StudentForm
            initial={{ name: '', year_level: '', subjects: '' }}
            onSave={handleCreate}
            onCancel={() => { setAddingNew(false); setError(null) }}
            saving={saving}
            error={error}
          />
        </div>
      ) : (
        <button
          onClick={() => { setAddingNew(true); setEditingId(null); setError(null) }}
          className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Add student
        </button>
      )}
    </div>
  )
}
