'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const AUS_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

function isValidABN(abn: string): boolean {
  const digits = abn.replace(/\s/g, '')
  if (!/^\d{11}$/.test(digits)) return false
  const nums = digits.split('').map(Number)
  nums[0] -= 1
  const sum = nums.reduce((acc, d, i) => acc + d * ABN_WEIGHTS[i], 0)
  return sum % 89 === 0
}

type TutorValues = {
  legal_name: string
  email: string
  phone: string
  location: string
  state: string
  postcode: string
  address: string
  abn: string
  wwcc_number: string
  wwcc_expiry: string
  date_of_birth: string
  bio: string
  subjects: string[]
  year_levels: string[]
  credentials: string[]
}

export default function EditTutorForm({
  tutorId,
  tutor,
}: {
  tutorId: string
  tutor: TutorValues
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(tutor)
  const [subjectsText, setSubjectsText] = useState(tutor.subjects.join(', '))
  const [yearLevelsText, setYearLevelsText] = useState(tutor.year_levels.join(', '))
  const [credentialsText, setCredentialsText] = useState(tutor.credentials.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof TutorValues, value: string) {
    setValues(v => ({ ...v, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean)
    const year_levels = yearLevelsText.split(',').map(s => s.trim()).filter(Boolean)
    const credentials = credentialsText.split(',').map(s => s.trim()).filter(Boolean)
    const res = await fetch(`/api/admin/tutors/${tutorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, subjects, year_levels, credentials }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      return
    }
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValues(tutor)
    setSubjectsText(tutor.subjects.join(', '))
    setYearLevelsText(tutor.year_levels.join(', '))
    setCredentialsText(tutor.credentials.join(', '))
    setError(null)
    setEditing(false)
  }

  const hasAnyProfile = !!(tutor.bio || tutor.abn || tutor.phone || tutor.location)

  return (
    <section className="bg-white rounded-lg border border-border p-6 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} disabled={saving}
              className="btn text-xs px-3 py-1.5">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <input className="input" value={values.legal_name}
                onChange={e => set('legal_name', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="input" value={values.email}
                onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input type="tel" className="input" value={values.phone}
                onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="ABN">
              <div className="relative">
                <input className="input" value={values.abn}
                  onChange={e => set('abn', e.target.value)} />
                {isValidABN(values.abn) && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                )}
              </div>
            </Field>
            <Field label="Address">
              <input className="input" value={values.address}
                onChange={e => set('address', e.target.value)} />
            </Field>
            <Field label="Suburb">
              <input className="input" value={values.location}
                onChange={e => set('location', e.target.value)} />
            </Field>
            <Field label="State">
              <select className="input" value={values.state}
                onChange={e => set('state', e.target.value)}>
                <option value="">—</option>
                {AUS_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Postcode">
              <input className="input" value={values.postcode}
                onChange={e => set('postcode', e.target.value)} />
            </Field>
            <Field label="WWCC number">
              <input className="input" value={values.wwcc_number}
                onChange={e => set('wwcc_number', e.target.value)} />
            </Field>
            <Field label="WWCC expiry">
              <input type="date" className="input" value={values.wwcc_expiry}
                onChange={e => set('wwcc_expiry', e.target.value)} />
            </Field>
            <Field label="Date of birth">
              <input type="date" className="input" value={values.date_of_birth}
                onChange={e => set('date_of_birth', e.target.value)} />
            </Field>
          </div>
          <Field label="Bio">
            <textarea className="input min-h-[80px] resize-y" value={values.bio}
              onChange={e => set('bio', e.target.value)} />
          </Field>
          <Field label="Subjects (comma-separated)">
            <input className="input" value={subjectsText}
              onChange={e => setSubjectsText(e.target.value)} />
          </Field>
          <Field label="Year levels (comma-separated)">
            <input className="input" value={yearLevelsText}
              onChange={e => setYearLevelsText(e.target.value)} />
          </Field>
          <Field label="Credentials (comma-separated)">
            <input className="input" value={credentialsText}
              onChange={e => setCredentialsText(e.target.value)} />
          </Field>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          {!hasAnyProfile && (
            <p className="text-sm text-muted-foreground italic">
              Tutor hasn&apos;t completed their profile yet.
            </p>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Phone" value={tutor.phone} />
            <Info label="Suburb" value={tutor.location} />
            <Info label="State" value={tutor.state} />
            <Info label="Postcode" value={tutor.postcode} />
            <div>
              <dt className="text-xs text-muted-foreground">ABN</dt>
              <dd className="font-medium mt-0.5 flex items-center gap-1.5">
                {tutor.abn || <span className="text-muted-foreground font-normal">—</span>}
                {isValidABN(tutor.abn ?? '') && <span className="text-green-500 text-sm">✓</span>}
              </dd>
            </div>
            <Info label="WWCC number" value={tutor.wwcc_number} />
            <Info label="WWCC expiry" value={tutor.wwcc_expiry ? format(new Date(tutor.wwcc_expiry), 'd MMM yyyy') : null} />
            <Info label="Date of birth" value={tutor.date_of_birth ? format(new Date(tutor.date_of_birth), 'd MMM yyyy') : null} />
            <Info label="Address" value={tutor.address} />
          </dl>
          {tutor.bio && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{tutor.bio}</p>
            </div>
          )}
          {(tutor.subjects.length > 0 || tutor.year_levels.length > 0) && (
            <div className="pt-2 border-t border-border flex flex-wrap gap-4">
              {tutor.subjects.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tutor.subjects.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-secondary text-primary rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {tutor.year_levels.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Year levels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tutor.year_levels.map((y: string) => (
                      <span key={y} className="px-2 py-0.5 bg-secondary text-primary rounded-full text-xs">{y}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tutor.credentials.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Credentials</p>
              <div className="flex flex-wrap gap-1.5">
                {tutor.credentials.map((c: string) => (
                  <span key={c} className="px-2 py-0.5 bg-secondary text-foreground rounded-full text-xs border border-border">{c}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">{value || <span className="text-muted-foreground font-normal">—</span>}</dd>
    </div>
  )
}
