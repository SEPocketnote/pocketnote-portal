'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function NewBookingForm({
  tutors,
  packages,
}: {
  tutors: any[]
  packages: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Parent
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    // Student
    studentName: '',
    yearLevel: '',
    subjects: '',
    // Booking
    tutorId: '',
    packageId: '',
    mode: 'online' as 'online' | 'in-person',
    location: '',
    // Schedule
    startDate: '',
    dayOfWeek: '',
    sessionTime: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create booking')
      router.push('/admin/bookings')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedPkg = packages.find(p => p.id === form.packageId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Parent */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Parent name" required>
            <input type="text" required className="input" value={form.parentName}
              onChange={e => setForm({...form, parentName: e.target.value})} />
          </Field>
          <Field label="Parent email" required>
            <input type="email" required className="input" value={form.parentEmail}
              onChange={e => setForm({...form, parentEmail: e.target.value})} />
          </Field>
          <Field label="Parent phone">
            <input type="tel" className="input" value={form.parentPhone}
              onChange={e => setForm({...form, parentPhone: e.target.value})} />
          </Field>
        </div>
      </section>

      {/* Student */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Student name" required>
            <input type="text" required className="input" value={form.studentName}
              onChange={e => setForm({...form, studentName: e.target.value})} />
          </Field>
          <Field label="Year level">
            <input type="text" className="input" placeholder="e.g. Year 10" value={form.yearLevel}
              onChange={e => setForm({...form, yearLevel: e.target.value})} />
          </Field>
          <Field label="Subjects">
            <input type="text" className="input" placeholder="e.g. Maths, English" value={form.subjects}
              onChange={e => setForm({...form, subjects: e.target.value})} />
          </Field>
        </div>
      </section>

      {/* Booking details */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tutor" required>
            <select required className="input" value={form.tutorId}
              onChange={e => setForm({...form, tutorId: e.target.value})}>
              <option value="">Select tutor</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.legal_name} — {t.location}</option>
              ))}
            </select>
          </Field>
          <Field label="Package" required>
            <select required className="input" value={form.packageId}
              onChange={e => setForm({...form, packageId: e.target.value})}>
              <option value="">Select package</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.type.charAt(0).toUpperCase() + p.type.slice(1)} ({p.sessions_total} sessions) —{' '}
                  ${p.type === 'single' ? (p.price_online / 100).toFixed(0) : (p.price_online / 100 / p.sessions_total).toFixed(0)}/session online
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode" required>
            <select required className="input" value={form.mode}
              onChange={e => setForm({...form, mode: e.target.value as any})}>
              <option value="online">Online</option>
              <option value="in-person">In-person</option>
            </select>
          </Field>
          {form.mode === 'in-person' && (
            <Field label="Location">
              <input type="text" className="input" placeholder="Address or suburb"
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </Field>
          )}
        </div>
      </section>

      {/* Schedule */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Schedule {selectedPkg && `— ${selectedPkg.sessions_total} sessions will be generated`}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="First session date" required>
            <input type="date" required className="input" value={form.startDate}
              onChange={e => setForm({...form, startDate: e.target.value})} />
          </Field>
          <Field label="Session time" required>
            <input type="time" required className="input" value={form.sessionTime}
              onChange={e => setForm({...form, sessionTime: e.target.value})} />
          </Field>
          <Field label="Recurring day">
            <select className="input" value={form.dayOfWeek}
              onChange={e => setForm({...form, dayOfWeek: e.target.value})}>
              <option value="">Same as start date</option>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Sessions will be created weekly from the start date.
        </p>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {loading ? 'Creating booking…' : 'Create booking & send welcome email'}
      </button>
    </form>
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
