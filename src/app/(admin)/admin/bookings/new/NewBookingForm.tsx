'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TutorPicker from './TutorPicker'
import ParentSearch, { type ParentResult } from './ParentSearch'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatAustralianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.startsWith('04') || digits.startsWith('05')) {
    const p1 = digits.slice(0, 4)
    const p2 = digits.slice(4, 7)
    const p3 = digits.slice(7, 10)
    return [p1, p2, p3].filter(Boolean).join(' ')
  } else if (digits.startsWith('0')) {
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

type ParentMode = 'idle' | 'existing' | 'new'
type StudentMode = 'existing' | 'new'

export default function NewBookingForm({
  tutors,
  packages,
  availability,
  initialValues,
}: {
  tutors: any[]
  packages: any[]
  availability: any[]
  initialValues?: Record<string, string>
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Parent
  const [parentMode, setParentMode] = useState<ParentMode>('idle')
  const [selectedParent, setSelectedParent] = useState<ParentResult | null>(null)
  const [newParent, setNewParent] = useState({
    name: initialValues?.parentName ?? '',
    email: initialValues?.parentEmail ?? '',
    phone: initialValues?.parentPhone ?? '',
  })
  const [parentFieldErrors, setParentFieldErrors] = useState({ email: '', phone: '' })

  // Student
  const [studentMode, setStudentMode] = useState<StudentMode>('new')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [newStudent, setNewStudent] = useState({
    name: initialValues?.studentName ?? '',
    yearLevel: initialValues?.yearLevel ?? '',
    subjects: initialValues?.subjects ?? '',
  })

  // Booking
  const [form, setForm] = useState({
    tutorId: '',
    packageId: '',
    mode: (initialValues?.mode ?? 'online') as 'online' | 'in-person',
    location: initialValues?.location ?? '',
    startDate: '',
    sessionTime: '',
    dayOfWeek: '',
  })

  function handleSelectExistingParent(parent: ParentResult) {
    setSelectedParent(parent)
    setParentMode('existing')
    setStudentMode('new')
    setSelectedStudentId('')
  }

  function handleCreateNewParent(prefill: { name: string; email: string; phone: string }) {
    setNewParent(prefill)
    setParentMode('new')
  }

  function handleClearParent() {
    setParentMode('idle')
    setSelectedParent(null)
    setSelectedStudentId('')
    setStudentMode('new')
  }

  function handleParentPhoneChange(value: string) {
    const formatted = formatAustralianPhone(value)
    setNewParent(p => ({ ...p, phone: formatted }))
    if (parentFieldErrors.phone) setParentFieldErrors(fe => ({ ...fe, phone: validatePhone(formatted) }))
  }

  function handleParentEmailChange(value: string) {
    setNewParent(p => ({ ...p, email: value }))
    if (parentFieldErrors.email) setParentFieldErrors(fe => ({ ...fe, email: validateEmail(value) }))
  }

  function handleParentBlur(field: 'email' | 'phone') {
    const value = field === 'email' ? newParent.email : newParent.phone
    const err = field === 'email' ? validateEmail(value) : validatePhone(value)
    setParentFieldErrors(fe => ({ ...fe, [field]: err }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (parentMode === 'idle') { setError('Please search for and select a parent'); return }

    if (parentMode === 'new') {
      const emailErr = validateEmail(newParent.email)
      const phoneErr = validatePhone(newParent.phone)
      setParentFieldErrors({ email: emailErr, phone: phoneErr })
      if (emailErr || phoneErr) return
      if (!newParent.name || !newParent.email) { setError('Parent name and email are required'); return }
    }

    if (studentMode === 'new' && !newStudent.name) { setError('Student name is required'); return }
    if (studentMode === 'existing' && !selectedStudentId) { setError('Please select a student'); return }
    if (!form.tutorId) { setError('Please select a tutor'); return }
    if (!form.packageId) { setError('Please select a package'); return }

    setLoading(true)
    setError('')

    const payload = {
      ...(parentMode === 'existing'
        ? { parentId: selectedParent!.id }
        : { parentName: newParent.name, parentEmail: newParent.email, parentPhone: newParent.phone }),
      ...(studentMode === 'existing'
        ? { studentId: selectedStudentId }
        : { studentName: newStudent.name, yearLevel: newStudent.yearLevel, subjects: newStudent.subjects }),
      ...form,
    }

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
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

  const parentResolved = parentMode !== 'idle'
  const selectedPkg = packages.find(p => p.id === form.packageId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Parent */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</h2>

        {parentMode === 'idle' && (
          <ParentSearch
            onSelect={handleSelectExistingParent}
            onCreateNew={handleCreateNewParent}
            initialQuery={initialValues?.parentEmail || initialValues?.parentName}
            initialPrefill={{
              name: initialValues?.parentName ?? '',
              email: initialValues?.parentEmail ?? '',
              phone: initialValues?.parentPhone ?? '',
            }}
          />
        )}

        {parentMode === 'existing' && selectedParent && (
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/40 border border-border">
            <div>
              <p className="text-sm font-medium">{selectedParent.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedParent.email}</p>
              {selectedParent.phone && (
                <p className="text-xs text-muted-foreground">{selectedParent.phone}</p>
              )}
            </div>
            <button type="button" onClick={handleClearParent}
              className="text-xs text-muted-foreground hover:text-primary shrink-0 mt-0.5">
              Change
            </button>
          </div>
        )}

        {parentMode === 'new' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">New parent</p>
              <button type="button" onClick={handleClearParent}
                className="text-xs text-muted-foreground hover:text-primary">
                ← Back to search
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input type="text" required className="input" value={newParent.name}
                  onChange={e => setNewParent(p => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Email address" required error={parentFieldErrors.email}>
                <input
                  type="email"
                  required
                  value={newParent.email}
                  onChange={e => handleParentEmailChange(e.target.value)}
                  onBlur={() => handleParentBlur('email')}
                  className={`input ${parentFieldErrors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                />
              </Field>
              <Field label="Phone number" error={parentFieldErrors.phone}>
                <input
                  type="tel"
                  value={newParent.phone}
                  onChange={e => handleParentPhoneChange(e.target.value)}
                  onBlur={() => handleParentBlur('phone')}
                  placeholder="0400 000 000"
                  className={`input ${parentFieldErrors.phone ? 'border-destructive focus:ring-destructive' : ''}`}
                />
              </Field>
            </div>
          </div>
        )}
      </section>

      {/* Student — only shown once parent is resolved */}
      {parentResolved && (
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</h2>

          {parentMode === 'existing' && selectedParent && selectedParent.students.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Select an existing student or add a new one</p>
              <div className="flex flex-wrap gap-2">
                {selectedParent.students.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setStudentMode('existing'); setSelectedStudentId(s.id) }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      studentMode === 'existing' && selectedStudentId === s.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white border-border hover:border-primary'
                    }`}
                  >
                    {s.name}{s.year_level ? ` · ${s.year_level}` : ''}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setStudentMode('new'); setSelectedStudentId('') }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    studentMode === 'new'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-border hover:border-primary'
                  }`}
                >
                  + New student
                </button>
              </div>
            </div>
          )}

          {studentMode === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Student name" required>
                <input type="text" required className="input" value={newStudent.name}
                  onChange={e => setNewStudent(s => ({ ...s, name: e.target.value }))} />
              </Field>
              <Field label="Year level">
                <input type="text" className="input" placeholder="e.g. Year 10" value={newStudent.yearLevel}
                  onChange={e => setNewStudent(s => ({ ...s, yearLevel: e.target.value }))} />
              </Field>
              <Field label="Subjects">
                <input type="text" className="input" placeholder="e.g. Maths, English" value={newStudent.subjects}
                  onChange={e => setNewStudent(s => ({ ...s, subjects: e.target.value }))} />
              </Field>
            </div>
          )}
        </section>
      )}

      {/* Booking details */}
      {parentResolved && (
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tutor" required>
              <TutorPicker
                tutors={tutors}
                availability={availability}
                value={form.tutorId}
                onChange={id => setForm(f => ({ ...f, tutorId: id }))}
              />
            </Field>
            <Field label="Package" required>
              <select required className="input" value={form.packageId}
                onChange={e => setForm(f => ({ ...f, packageId: e.target.value }))}>
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
                onChange={e => setForm(f => ({ ...f, mode: e.target.value as any }))}>
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
              </select>
            </Field>
            {form.mode === 'in-person' && (
              <Field label="Location">
                <input type="text" className="input" placeholder="Address or suburb"
                  value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </Field>
            )}
          </div>
        </section>
      )}

      {/* Schedule */}
      {parentResolved && (
        <section className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Schedule{selectedPkg ? ` — ${selectedPkg.sessions_total} sessions will be generated` : ''}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First session date" required>
              <input type="date" required className="input" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Session time" required>
              <input type="time" required className="input" value={form.sessionTime}
                onChange={e => setForm(f => ({ ...f, sessionTime: e.target.value }))} />
            </Field>
            <Field label="Recurring day">
              <select className="input" value={form.dayOfWeek}
                onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                <option value="">Same as start date</option>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Sessions will be created weekly from the start date.</p>
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {parentResolved && (
        <button type="submit" disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating booking…' : 'Create booking & send welcome email'}
        </button>
      )}
    </form>
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
