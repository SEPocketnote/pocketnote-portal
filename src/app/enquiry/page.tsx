'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

const SUBJECTS = ['Maths', 'English', 'Science', 'Chemistry', 'Physics', 'Biology', 'History', 'Geography', 'Economics', 'Other']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function EnquiryPage() {
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
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or call us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-semibold mb-2">Thanks, we&apos;ll be in touch!</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your enquiry and will contact you within 1 business day to discuss the best tutor match for {form.studentName}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Get started with Pocketnote</h1>
          <p className="text-muted-foreground mt-1">Tell us about your child and we&apos;ll find the right tutor.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Your details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your name" required>
                <input
                  type="text"
                  required
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Email address" required>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">About your child</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Child&apos;s name" required>
                <input
                  type="text"
                  required
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Year level" required>
                <select
                  required
                  value={form.yearLevel}
                  onChange={(e) => setForm({ ...form, yearLevel: e.target.value })}
                  className="input"
                >
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Subjects needed <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
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
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Session preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Location (suburb)" required>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="input"
                  placeholder="e.g. Bondi, 2026"
                />
              </Field>
              <Field label="Session mode" required>
                <select
                  required
                  value={form.modePreference}
                  onChange={(e) => setForm({ ...form, modePreference: e.target.value })}
                  className="input"
                >
                  <option value="">Select mode</option>
                  <option value="in-person">In-person</option>
                  <option value="online">Online</option>
                  <option value="either">Either works</option>
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Preferred days</label>
              <div className="flex flex-wrap gap-2">
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
            </div>

            <div className="mt-4">
              <Field label="Preferred times">
                <input
                  type="text"
                  value={form.preferredTimes}
                  onChange={(e) => setForm({ ...form, preferredTimes: e.target.value })}
                  className="input"
                  placeholder="e.g. After 4pm weekdays"
                />
              </Field>
            </div>
          </section>

          <section>
            <Field label="How did you hear about us?">
              <select
                value={form.howHeard}
                onChange={(e) => setForm({ ...form, howHeard: e.target.value })}
                className="input"
              >
                <option value="">Select…</option>
                <option>Google search</option>
                <option>Facebook / Instagram</option>
                <option>Word of mouth</option>
                <option>School recommendation</option>
                <option>Other</option>
              </select>
            </Field>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || form.subjects.length === 0}
            className="w-full bg-primary text-primary-foreground rounded-md px-4 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit enquiry'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
