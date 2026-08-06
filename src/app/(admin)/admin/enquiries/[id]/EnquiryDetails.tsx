'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['new', 'contacted', 'confirmed', 'waitlisted', 'unconverted'] as const
const SUBJECTS = ['Maths', 'English', 'Science', 'Chemistry', 'Physics', 'Biology', 'History', 'Geography', 'Economics', 'Other']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOW_HEARD_OPTIONS = ['Google search', 'Facebook / Instagram', 'Word of mouth', 'School recommendation', 'Phone enquiry', 'Email enquiry', 'Other']

type Enquiry = {
  id: string
  parent_name: string
  email: string
  phone: string | null
  student_name: string
  year_level: string | null
  subjects: string[]
  location: string | null
  mode_preference: string | null
  preferred_days: string[]
  preferred_times: string | null
  how_heard: string | null
  status: string
}

type FormState = {
  parentName: string
  email: string
  phone: string
  studentName: string
  yearLevel: string
  subjects: string[]
  location: string
  modePreference: string
  preferredDays: string[]
  preferredTimes: string
  howHeard: string
  status: string
}

function formFromEnquiry(e: Enquiry): FormState {
  return {
    parentName: e.parent_name,
    email: e.email,
    phone: e.phone ?? '',
    studentName: e.student_name,
    yearLevel: e.year_level ?? '',
    subjects: e.subjects ?? [],
    location: e.location ?? '',
    modePreference: e.mode_preference ?? '',
    preferredDays: e.preferred_days ?? [],
    preferredTimes: e.preferred_times ?? '',
    howHeard: e.how_heard ?? '',
    status: e.status,
  }
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
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

function ChipGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (val: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(toggle(selected, o))}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            selected.includes(o)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white text-foreground border-border hover:border-primary'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export default function EnquiryDetails({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => f && { ...f, [key]: value })
  }

  function openEdit() {
    setForm(formFromEnquiry(enquiry))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setError('')
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/enquiries/${enquiry.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        parentName: form.parentName,
        email: form.email,
        phone: form.phone || null,
        studentName: form.studentName,
        yearLevel: form.yearLevel,
        subjects: form.subjects,
        location: form.location,
        modePreference: form.modePreference || undefined,
        preferredDays: form.preferredDays,
        preferredTimes: form.preferredTimes || null,
        howHeard: form.howHeard || null,
        status: form.status,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to save')
      return
    }
    setEditing(false)
    setForm(null)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-lg border border-border p-6 mb-6 space-y-4">
        <div className="flex justify-end">
          <button onClick={openEdit} className="text-sm text-primary hover:underline">
            Edit
          </button>
        </div>

        <Section title="Parent">
          <Row label="Name" value={enquiry.parent_name} />
          <Row label="Email" value={<a href={`mailto:${enquiry.email}`} className="text-primary hover:underline">{enquiry.email}</a>} />
          <Row label="Phone" value={enquiry.phone || '—'} />
        </Section>

        <hr className="border-border" />

        <Section title="Student">
          <Row label="Name" value={enquiry.student_name} />
          <Row label="Year level" value={enquiry.year_level || '—'} />
          <Row label="Subjects" value={enquiry.subjects?.join(', ') || '—'} />
        </Section>

        <hr className="border-border" />

        <Section title="Session preferences">
          <Row label="Location" value={enquiry.location || '—'} />
          <Row label="Mode" value={enquiry.mode_preference || '—'} />
          <Row label="Preferred days" value={enquiry.preferred_days?.join(', ') || '—'} />
          <Row label="Preferred times" value={enquiry.preferred_times || '—'} />
        </Section>

        {enquiry.how_heard && (
          <>
            <hr className="border-border" />
            <Row label="How heard" value={enquiry.how_heard} />
          </>
        )}

        <hr className="border-border" />

        <Section title="Status">
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="radio" checked={enquiry.status === s} readOnly className="accent-primary" />
                <span className="text-sm capitalize">{s}</span>
              </label>
            ))}
          </div>
        </Section>
      </div>
    )
  }

  // Edit mode
  const f = form!
  return (
    <div className="bg-white rounded-lg border border-border p-6 mb-6 space-y-6">
      <h2 className="font-medium">Edit enquiry</h2>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input type="text" required value={f.parentName} onChange={(e) => set('parentName', e.target.value)} className="input" />
          </Field>
          <Field label="Email" required>
            <input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} className="input" />
          </Field>
          <Field label="Phone">
            <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} className="input" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input type="text" required value={f.studentName} onChange={(e) => set('studentName', e.target.value)} className="input" />
          </Field>
          <Field label="Year level" required>
            <select value={f.yearLevel} onChange={(e) => set('yearLevel', e.target.value)} className="input">
              <option value="">Select year level</option>
              {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Subjects">
          <ChipGroup options={SUBJECTS} selected={f.subjects} onChange={(v) => set('subjects', v)} />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Location (suburb)">
            <input type="text" value={f.location} onChange={(e) => set('location', e.target.value)} className="input" placeholder="e.g. Bondi, 2026" />
          </Field>
          <Field label="Session mode">
            <select value={f.modePreference} onChange={(e) => set('modePreference', e.target.value)} className="input">
              <option value="">Select mode</option>
              <option value="in-person">In-person</option>
              <option value="online">Online</option>
              <option value="either">Either works</option>
            </select>
          </Field>
        </div>
        <Field label="Preferred days">
          <ChipGroup options={DAYS} selected={f.preferredDays} onChange={(v) => set('preferredDays', v)} />
        </Field>
        <Field label="Preferred times">
          <input type="text" value={f.preferredTimes} onChange={(e) => set('preferredTimes', e.target.value)} className="input" placeholder="e.g. After 4pm weekdays" />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How heard</h3>
        <select value={f.howHeard} onChange={(e) => set('howHeard', e.target.value)} className="input">
          <option value="">Select…</option>
          {HOW_HEARD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</h3>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                checked={f.status === s}
                onChange={() => set('status', s)}
                className="accent-primary"
              />
              <span className="text-sm capitalize">{s}</span>
            </label>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="px-5 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
