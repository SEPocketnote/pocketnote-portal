'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECTS = ['Maths', 'English', 'Science', 'Chemistry', 'Physics', 'Biology', 'History', 'Geography', 'Economics', 'Other']
const YEAR_LEVELS = ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12']

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export default function NewTutorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    legalName: '',
    email: '',
    phone: '',
    location: '',
    subjects: [] as string[],
    yearLevels: [] as string[],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tutors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create tutor')
      router.push('/admin/tutors')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/admin/tutors" className="text-sm text-muted-foreground hover:text-primary">← Back to tutors</a>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Add tutor</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Legal full name" required>
              <input type="text" required value={form.legalName}
                onChange={e => setForm({...form, legalName: e.target.value})} className="input" />
            </Field>
            <Field label="Email address" required>
              <input type="email" required value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} className="input" />
            </Field>
            <Field label="Phone number">
              <input type="tel" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})} className="input" />
            </Field>
            <Field label="Location (suburb)">
              <input type="text" value={form.location}
                onChange={e => setForm({...form, location: e.target.value})} className="input"
                placeholder="e.g. Bondi" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} type="button"
                onClick={() => setForm({...form, subjects: toggle(form.subjects, s)})}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.subjects.includes(s)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white border-border hover:border-primary'
                }`}>{s}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Year levels</h2>
          <div className="flex flex-wrap gap-2">
            {YEAR_LEVELS.map(y => (
              <button key={y} type="button"
                onClick={() => setForm({...form, yearLevels: toggle(form.yearLevels, y)})}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.yearLevels.includes(y)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white border-border hover:border-primary'
                }`}>{y}</button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={loading}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating…' : 'Create tutor & send invite'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
