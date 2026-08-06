'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUBJECTS = ['Maths', 'English', 'Science', 'Chemistry', 'Physics', 'Biology', 'History', 'Geography', 'Economics', 'Other']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOW_HEARD_OPTIONS = ['Google search', 'Facebook / Instagram', 'Word of mouth', 'School recommendation', 'Phone enquiry', 'Email enquiry', 'Other']

export default function NewEnquiryPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    parentName: '',
    email: '',
    phone: '',
    studentName: '',
    yearLevel: '',
    subjects: [] as string[],
    location: '',
    modePreference: '',
    preferredDays: [] as string[],
    preferredTimes: '',
    howHeard: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.subjects.length === 0) { setError('Please select at least one subject.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/enquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        modePreference: form.modePreference as 'in-person' | 'online' | 'either',
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to save enquiry')
      return
    }
    const { id } = await res.json()
    router.push(`/admin/enquiries/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/enquiries" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to enquiries
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">New enquiry</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-6">
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parent name" required>
              <input type="text" required value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className="input" />
            </Field>
            <Field label="Email" required>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">About the student</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Student name" required>
              <input type="text" required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className="input" />
            </Field>
            <Field label="Year level" required>
              <select required value={form.yearLevel} onChange={(e) => setForm({ ...form, yearLevel: e.target.value })} className="input">
                <option value="">Select year level</option>
                {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Subjects" required>
            <div className="flex flex-wrap gap-2 mt-1">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, subjects: toggle(form.subjects, s) })}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    form.subjects.includes(s)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-foreground border-border hover:border-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location (suburb)" required>
              <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" placeholder="e.g. Bondi, 2026" />
            </Field>
            <Field label="Session mode" required>
              <select required value={form.modePreference} onChange={(e) => setForm({ ...form, modePreference: e.target.value })} className="input">
                <option value="">Select mode</option>
                <option value="in-person">In-person</option>
                <option value="online">Online</option>
                <option value="either">Either works</option>
              </select>
            </Field>
          </div>
          <Field label="Preferred days">
            <div className="flex flex-wrap gap-2 mt-1">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, preferredDays: toggle(form.preferredDays, d) })}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    form.preferredDays.includes(d)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-foreground border-border hover:border-primary'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Preferred times">
            <input type="text" value={form.preferredTimes} onChange={(e) => setForm({ ...form, preferredTimes: e.target.value })} className="input" placeholder="e.g. After 4pm weekdays" />
          </Field>
        </section>

        <section>
          <Field label="How did you hear about us?">
            <select value={form.howHeard} onChange={(e) => setForm({ ...form, howHeard: e.target.value })} className="input">
              <option value="">Select…</option>
              {HOW_HEARD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Create enquiry'}
          </button>
          <Link href="/admin/enquiries" className="px-5 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
