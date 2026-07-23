'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECTS = ['Maths', 'English', 'Science', 'Chemistry', 'Physics', 'Biology', 'History', 'Geography', 'Economics', 'Other']
const YEAR_LEVELS = ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12']

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function formatAustralianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.startsWith('04') || digits.startsWith('05')) {
    // Mobile: 0400 000 000
    const p1 = digits.slice(0, 4)
    const p2 = digits.slice(4, 7)
    const p3 = digits.slice(7, 10)
    return [p1, p2, p3].filter(Boolean).join(' ')
  } else if (digits.startsWith('0')) {
    // Landline: (02) 0000 0000
    const area = digits.slice(0, 2)
    const p1 = digits.slice(2, 6)
    const p2 = digits.slice(6, 10)
    if (digits.length <= 2) return area
    if (digits.length <= 6) return `(${area}) ${p1}`
    return `(${area}) ${p1} ${p2}`.trim()
  }
  return digits
}

function validateEmail(value: string): string {
  if (!value) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address'
}

function validatePhone(value: string): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? '' : 'Enter a valid 10-digit Australian phone number'
}

export default function NewTutorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: '', phone: '' })
  const [form, setForm] = useState({
    legalName: '',
    email: '',
    phone: '',
    location: '',
    state: '',
    postcode: '',
    subjects: [] as string[],
    yearLevels: [] as string[],
  })

  function handleEmailChange(value: string) {
    setForm(f => ({ ...f, email: value }))
    if (fieldErrors.email) setFieldErrors(fe => ({ ...fe, email: validateEmail(value) }))
  }

  function handlePhoneChange(value: string) {
    const formatted = formatAustralianPhone(value)
    setForm(f => ({ ...f, phone: formatted }))
    if (fieldErrors.phone) setFieldErrors(fe => ({ ...fe, phone: validatePhone(formatted) }))
  }

  function handleBlur(field: 'email' | 'phone') {
    const value = form[field]
    const err = field === 'email' ? validateEmail(value) : validatePhone(value)
    setFieldErrors(fe => ({ ...fe, [field]: err }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailErr = validateEmail(form.email)
    const phoneErr = validatePhone(form.phone)
    setFieldErrors({ email: emailErr, phone: phoneErr })
    if (emailErr || phoneErr) return

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
      if (data.emailError) {
        setError(`Tutor created but invite email failed: ${data.emailError}`)
        return
      }
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
            <Field label="Email address" required error={fieldErrors.email}>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`input ${fieldErrors.email ? 'border-destructive focus:ring-destructive' : ''}`}
              />
            </Field>
            <Field label="Phone number" error={fieldErrors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handlePhoneChange(e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="0400 000 000"
                className={`input ${fieldErrors.phone ? 'border-destructive focus:ring-destructive' : ''}`}
              />
            </Field>
            <Field label="Suburb">
              <input type="text" value={form.location}
                onChange={e => setForm({...form, location: e.target.value})} className="input"
                placeholder="e.g. Bondi" />
            </Field>
            <Field label="State">
              <select className="input" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                <option value="">Select state</option>
                {['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Postcode">
              <input type="text" value={form.postcode}
                onChange={e => setForm({...form, postcode: e.target.value})} className="input"
                placeholder="e.g. 2026" />
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

function Field({ label, children, required, error }: {
  label: string
  children: React.ReactNode
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
