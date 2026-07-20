'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECTS = ['Maths', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Legal Studies', 'Music', 'Art']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']

export default function EditTutorForm({ tutor }: { tutor: any }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    legal_name: tutor.legal_name ?? '',
    email: tutor.email ?? '',
    phone: tutor.phone ?? '',
    location: tutor.location ?? '',
    bio: tutor.bio ?? '',
    abn: tutor.abn ?? '',
    wwcc_number: tutor.wwcc_number ?? '',
    wwcc_expiry: tutor.wwcc_expiry ?? '',
    subjects: (tutor.subjects ?? []) as string[],
    year_levels: (tutor.year_levels ?? []) as string[],
  })

  function togglePill(field: 'subjects' | 'year_levels', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v: string) => v !== value)
        : [...f[field], value],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/tutors/${tutor.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Saved')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(field: 'active' | 'verified') {
    setToggling(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/tutors/${tutor.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: !tutor[field] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status toggles */}
      <section className="bg-white rounded-lg border border-border p-4 flex flex-wrap gap-3">
        <button type="button" disabled={toggling}
          onClick={() => handleToggle('active')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
            tutor.active
              ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
          }`}>
          {tutor.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
        </button>
        <button type="button" disabled={toggling}
          onClick={() => handleToggle('verified')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
            tutor.verified
              ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
          }`}>
          {tutor.verified ? 'Verified — click to unverify' : 'Unverified — click to verify'}
        </button>
      </section>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Basic info */}
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Legal name">
              <input type="text" className="input" value={form.legal_name}
                onChange={e => setForm({ ...form, legal_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className="input" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input type="tel" className="input" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Location / suburb">
              <input type="text" className="input" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })} />
            </Field>
          </div>
          <Field label="Bio">
            <textarea rows={3} className="input resize-none" value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })} />
          </Field>
        </section>

        {/* Compliance */}
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="ABN">
              <input type="text" className="input" value={form.abn}
                onChange={e => setForm({ ...form, abn: e.target.value })} />
            </Field>
            <Field label="WWCC number">
              <input type="text" className="input" value={form.wwcc_number}
                onChange={e => setForm({ ...form, wwcc_number: e.target.value })} />
            </Field>
            <Field label="WWCC expiry">
              <input type="date" className="input" value={form.wwcc_expiry}
                onChange={e => setForm({ ...form, wwcc_expiry: e.target.value })} />
            </Field>
          </div>
        </section>

        {/* Subjects */}
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} type="button"
                onClick={() => togglePill('subjects', s)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.subjects.includes(s)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {s}
              </button>
            ))}
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Year levels</h2>
          <div className="flex flex-wrap gap-2">
            {YEAR_LEVELS.map(y => (
              <button key={y} type="button"
                onClick={() => togglePill('year_levels', y)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.year_levels.includes(y)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {y}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
