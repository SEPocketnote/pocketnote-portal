'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import SuburbAutocomplete from '@/components/SuburbAutocomplete'

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

type RateTier = {
  id: string
  name: string
  online_rate_cents: number
  inperson_rate_cents: number
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
  rate_tier_id: string | null
  online_rate_override_cents: number | null
  inperson_rate_override_cents: number | null
  mode: string
}

export default function EditTutorForm({
  tutorId,
  tutor,
  rateTiers,
}: {
  tutorId: string
  tutor: TutorValues
  rateTiers: RateTier[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(tutor)
  const [subjectsText, setSubjectsText] = useState(tutor.subjects.join(', '))
  const [yearLevelsText, setYearLevelsText] = useState(tutor.year_levels.join(', '))
  const [credentialsText, setCredentialsText] = useState(tutor.credentials.join(', '))
  const [onlineOverrideDollars, setOnlineOverrideDollars] = useState(
    tutor.online_rate_override_cents ? (tutor.online_rate_override_cents / 100).toFixed(2) : ''
  )
  const [inpersonOverrideDollars, setInpersonOverrideDollars] = useState(
    tutor.inperson_rate_override_cents ? (tutor.inperson_rate_override_cents / 100).toFixed(2) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abnStatus, setAbnStatus] = useState<{ state: 'idle' | 'loading' | 'valid' | 'invalid'; name?: string; status?: string }>({ state: 'idle' })
  const abnDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function set(key: keyof TutorValues, value: string | null) {
    setValues(v => ({ ...v, [key]: value }))
    if (key === 'abn') lookupABN(value ?? '')
  }

  function lookupABN(raw: string) {
    if (abnDebounce.current) clearTimeout(abnDebounce.current)
    if (!isValidABN(raw)) {
      setAbnStatus({ state: 'idle' })
      return
    }
    setAbnStatus({ state: 'loading' })
    abnDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/abn-lookup?abn=${encodeURIComponent(raw.replace(/\s/g, ''))}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setAbnStatus({ state: 'invalid' })
      } else {
        setAbnStatus({ state: data.status === 'Active' ? 'valid' : 'invalid', name: data.name, status: data.status })
      }
    }, 600)
  }

  // Run lookup on mount if ABN is already populated
  useEffect(() => { if (tutor.abn) lookupABN(tutor.abn) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tier = rateTiers.find(t => t.id === values.rate_tier_id)
  const effectiveOnlineCents = onlineOverrideDollars
    ? Math.round(parseFloat(onlineOverrideDollars) * 100)
    : (tier?.online_rate_cents ?? null)
  const effectiveInpersonCents = inpersonOverrideDollars
    ? Math.round(parseFloat(inpersonOverrideDollars) * 100)
    : (tier?.inperson_rate_cents ?? null)

  async function save() {
    setSaving(true)
    setError(null)
    const subjects = subjectsText.split(',').map(s => s.trim()).filter(Boolean)
    const year_levels = yearLevelsText.split(',').map(s => s.trim()).filter(Boolean)
    const credentials = credentialsText.split(',').map(s => s.trim()).filter(Boolean)
    const online_rate_override_cents = onlineOverrideDollars
      ? Math.round(parseFloat(onlineOverrideDollars) * 100)
      : null
    const inperson_rate_override_cents = inpersonOverrideDollars
      ? Math.round(parseFloat(inpersonOverrideDollars) * 100)
      : null
    const res = await fetch(`/api/admin/tutors/${tutorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        subjects,
        year_levels,
        credentials,
        online_rate_override_cents,
        inperson_rate_override_cents,
      }),
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
    setOnlineOverrideDollars(tutor.online_rate_override_cents ? (tutor.online_rate_override_cents / 100).toFixed(2) : '')
    setInpersonOverrideDollars(tutor.inperson_rate_override_cents ? (tutor.inperson_rate_override_cents / 100).toFixed(2) : '')
    setError(null)
    setEditing(false)
  }

  const hasAnyProfile = !!(tutor.bio || tutor.abn || tutor.phone || tutor.location)

  return (
    <section className="bg-white rounded-2xl shadow-card p-6 mt-4 space-y-4">
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
                {abnStatus.state === 'loading' && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">…</span>
                )}
                {abnStatus.state === 'valid' && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                )}
                {abnStatus.state === 'invalid' && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 text-sm">✗</span>
                )}
              </div>
              {abnStatus.state === 'valid' && abnStatus.name && (
                <p className="text-xs text-green-600 mt-1">{abnStatus.name} · {abnStatus.status}</p>
              )}
              {abnStatus.state === 'invalid' && (
                <p className="text-xs text-red-500 mt-1">ABN not found or cancelled</p>
              )}
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <AddressAutocomplete
                value={values.address}
                onChange={v => setValues(vals => ({ ...vals, address: v }))}
                onSelect={r => setValues(vals => ({
                  ...vals,
                  address: r.streetAddress,
                  location: r.suburb || vals.location,
                  state: r.state || vals.state,
                  postcode: r.postcode || vals.postcode,
                }))}
                className="input"
              />
            </Field>
            <Field label="Suburb">
              <SuburbAutocomplete
                value={values.location}
                onChange={v => setValues(vals => ({ ...vals, location: v }))}
                onSelect={r => setValues(vals => ({ ...vals, location: r.suburb, state: r.state, postcode: r.postcode }))}
              />
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
          <Field label="Session mode">
            <select className="input" value={values.mode}
              onChange={e => set('mode', e.target.value)}>
              <option value="either">Online & in-person</option>
              <option value="online">Online only</option>
              <option value="in-person">In-person only</option>
            </select>
          </Field>

          {/* Pay Rate section */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Pay Rate</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rate tier">
                <select
                  className="input"
                  value={values.rate_tier_id ?? ''}
                  onChange={e => setValues(v => ({ ...v, rate_tier_id: e.target.value || null }))}
                >
                  <option value="">No tier assigned</option>
                  {rateTiers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ${(t.online_rate_cents / 100).toFixed(2)} online / ${(t.inperson_rate_cents / 100).toFixed(2)} in-person
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-1" />
              <Field label="Online rate override ($/hr)">
                <input
                  type="number" step="0.01" placeholder="Leave blank to use tier rate"
                  className="input"
                  value={onlineOverrideDollars}
                  onChange={e => setOnlineOverrideDollars(e.target.value)}
                />
                {effectiveOnlineCents !== null && !isNaN(effectiveOnlineCents) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Effective: ${(effectiveOnlineCents / 100).toFixed(2)}/hr
                    {onlineOverrideDollars ? ' (custom)' : ' (tier)'}
                  </p>
                )}
              </Field>
              <Field label="In-person rate override ($/hr)">
                <input
                  type="number" step="0.01" placeholder="Leave blank to use tier rate"
                  className="input"
                  value={inpersonOverrideDollars}
                  onChange={e => setInpersonOverrideDollars(e.target.value)}
                />
                {effectiveInpersonCents !== null && !isNaN(effectiveInpersonCents) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Effective: ${(effectiveInpersonCents / 100).toFixed(2)}/hr
                    {inpersonOverrideDollars ? ' (custom)' : ' (tier)'}
                  </p>
                )}
              </Field>
            </div>
            {!effectiveOnlineCents && !effectiveInpersonCents && !values.rate_tier_id && (
              <p className="text-xs text-amber-600 mt-2">No rate set — tutor cannot submit invoices.</p>
            )}
          </div>

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
            <Info label="Session mode" value={tutor.mode === 'either' ? 'Online & in-person' : tutor.mode === 'online' ? 'Online only' : 'In-person only'} />
            <Info label="Suburb" value={tutor.location} />
            <Info label="State" value={tutor.state} />
            <Info label="Postcode" value={tutor.postcode} />
            <Info label="ABN" value={tutor.abn} />
            <Info label="WWCC number" value={tutor.wwcc_number} />
            <Info label="WWCC expiry" value={tutor.wwcc_expiry ? format(new Date(tutor.wwcc_expiry), 'd MMM yyyy') : null} />
            <Info label="Date of birth" value={tutor.date_of_birth ? format(new Date(tutor.date_of_birth), 'd MMM yyyy') : null} />
            <Info label="Address" value={tutor.address} />
          </dl>

          {/* Pay rate display */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Pay rate</p>
            {(() => {
              const t = rateTiers.find(rt => rt.id === tutor.rate_tier_id)
              const onlineCents = tutor.online_rate_override_cents ?? t?.online_rate_cents ?? null
              const inpersonCents = tutor.inperson_rate_override_cents ?? t?.inperson_rate_cents ?? null
              if (!onlineCents && !inpersonCents) {
                return <p className="text-sm text-amber-600">No rate assigned</p>
              }
              const label = (tutor.online_rate_override_cents || tutor.inperson_rate_override_cents)
                ? 'custom override'
                : t ? `${t.name} tier` : ''
              return (
                <div className="text-sm space-y-0.5">
                  {onlineCents && <p className="font-medium">Online: ${(onlineCents / 100).toFixed(2)}/hr <span className="text-xs font-normal text-muted-foreground">({label})</span></p>}
                  {inpersonCents && <p className="font-medium">In-person: ${(inpersonCents / 100).toFixed(2)}/hr <span className="text-xs font-normal text-muted-foreground">({label})</span></p>}
                </div>
              )
            })()}
          </div>

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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
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
