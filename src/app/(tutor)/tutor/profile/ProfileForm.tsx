'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECTS = ['Maths', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Legal Studies', 'Music', 'Art']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']

export default function ProfileForm({ tutor }: { tutor: any }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    phone: tutor.phone ?? '',
    address: tutor.address ?? '',
    bio: tutor.bio ?? '',
    abn: tutor.abn ?? '',
    wwcc_number: tutor.wwcc_number ?? '',
    wwcc_expiry: tutor.wwcc_expiry ?? '',
    date_of_birth: tutor.date_of_birth ?? '',
    location: tutor.location ?? '',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/tutor/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Profile saved')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Read-only identity */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Legal name">
            <p className="text-sm py-2 px-3 bg-muted/40 rounded-md text-foreground">{tutor.legal_name}</p>
          </Field>
          <Field label="Email">
            <p className="text-sm py-2 px-3 bg-muted/40 rounded-md text-foreground">{tutor.email}</p>
          </Field>
          <Field label="Phone">
            <input type="tel" className="input" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Suburb / location">
            <input type="text" className="input" placeholder="e.g. Bondi" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Home address" className="sm:col-span-2">
            <input type="text" className="input" placeholder="Street address" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea rows={4} className="input resize-none"
            placeholder="A short intro about yourself, your teaching style and experience"
            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
        </Field>
      </section>

      {/* Compliance */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</h2>
        <p className="text-xs text-muted-foreground">Required before you can be activated on the platform.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="ABN">
            <input type="text" className="input" placeholder="e.g. 12 345 678 901" value={form.abn}
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
          <Field label="Date of birth">
            <input type="date" className="input" value={form.date_of_birth}
              onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* Subjects & year levels */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you teach</h2>
        <div>
          <p className="text-sm font-medium mb-2">Subjects</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} type="button" onClick={() => togglePill('subjects', s)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.subjects.includes(s)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Year levels</p>
          <div className="flex flex-wrap gap-2">
            {YEAR_LEVELS.map(y => (
              <button key={y} type="button" onClick={() => togglePill('year_levels', y)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.year_levels.includes(y)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button type="submit" disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
