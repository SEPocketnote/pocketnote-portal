'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvailabilityGrid from '@/app/(tutor)/tutor/availability/AvailabilityGrid'

const SUBJECTS = ['Maths', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Legal Studies', 'Music', 'Art', 'Other']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']
const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']

type Slot = { id: string; day_of_week: number; start_time: string; end_time: string }

type AbnStatus = { state: 'idle' | 'loading' | 'valid' | 'invalid'; name?: string; gstRegistered?: boolean }

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Profile', 'Availability', 'Agreement']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              done ? 'bg-primary text-primary-foreground' :
              active ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {done ? '✓' : n}
            </div>
            <span className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            {i < steps.length - 1 && <div className={`h-px w-8 ${done ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, children, error, className }: {
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function OnboardingFlow({
  tutor,
  initialSlots,
}: {
  tutor: any
  initialSlots: Slot[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [slotCount, setSlotCount] = useState(initialSlots.length)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [credInput, setCredInput] = useState('')
  const [abnStatus, setAbnStatus] = useState<AbnStatus>({ state: 'idle' })

  const [form, setForm] = useState({
    photo_url: tutor.photo_url ?? '',
    bio: tutor.bio ?? '',
    phone: tutor.phone ?? '',
    abn: tutor.abn ?? '',
    gst_registered: tutor.gst_registered ?? false,
    wwcc_number: tutor.wwcc_number ?? '',
    wwcc_expiry: tutor.wwcc_expiry ?? '',
    location: tutor.location ?? '',
    state: tutor.state ?? '',
    postcode: tutor.postcode ?? '',
    address: tutor.address ?? '',
    subjects: (tutor.subjects ?? []) as string[],
    year_levels: (tutor.year_levels ?? []) as string[],
    credentials: (tutor.credentials ?? []) as string[],
  })

  // ── Photo upload ──────────────────────────────────────────────────────────

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${tutor.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('tutor-photos')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('tutor-photos').getPublicUrl(path)
      await fetch('/api/tutor/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ photo_url: publicUrl }),
      })
      setForm(f => ({ ...f, photo_url: publicUrl }))
    } catch (err: any) {
      setError('Photo upload failed: ' + err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  // ── ABN lookup ────────────────────────────────────────────────────────────

  async function verifyAbn() {
    const abn = form.abn.replace(/\s/g, '')
    if (!abn) return
    setAbnStatus({ state: 'loading' })
    try {
      const res = await fetch(`/api/admin/abn-lookup?abn=${encodeURIComponent(abn)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setAbnStatus({ state: 'invalid' })
      } else {
        const gstRegistered = data.gstRegistered ?? false
        setAbnStatus({ state: data.status === 'Active' ? 'valid' : 'invalid', name: data.name, gstRegistered })
        if (data.status === 'Active') {
          setForm(f => ({ ...f, gst_registered: gstRegistered }))
        }
      }
    } catch {
      setAbnStatus({ state: 'invalid' })
    }
  }

  // ── Credentials ───────────────────────────────────────────────────────────

  function addCredential() {
    const val = credInput.trim()
    if (val && !form.credentials.includes(val)) {
      setForm(f => ({ ...f, credentials: [...f.credentials, val] }))
    }
    setCredInput('')
  }

  function removeCredential(val: string) {
    setForm(f => ({ ...f, credentials: f.credentials.filter(c => c !== val) }))
  }

  // ── Step 1 → 2: save profile ──────────────────────────────────────────────

  async function handleProfileNext() {
    setError('')
    const missing: string[] = []
    if (!form.photo_url) missing.push('profile photo')
    if (!form.bio.trim()) missing.push('bio')
    if (!form.phone.trim()) missing.push('phone number')
    if (!form.abn.trim()) missing.push('ABN')
    if (!form.wwcc_number.trim()) missing.push('WWCC number')
    if (!form.wwcc_expiry) missing.push('WWCC expiry')
    if (!form.subjects.length) missing.push('at least one subject')
    if (!form.year_levels.length) missing.push('at least one year level')
    if (missing.length) {
      setError(`Please complete: ${missing.join(', ')}.`)
      return
    }

    setSaving(true)
    try {
      // Only include gst_registered if ABN was verified this session
      const payload: Record<string, any> = { ...form }
      if (abnStatus.state !== 'valid') delete payload.gst_registered

      const res = await fetch('/api/tutor/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Step 2 → 3: check availability ───────────────────────────────────────

  function handleAvailabilityNext() {
    setError('')
    if (slotCount === 0) {
      setError('Please add at least one availability slot before continuing.')
      return
    }
    setStep(3)
  }

  // ── Step 3: complete onboarding ───────────────────────────────────────────

  async function handleComplete() {
    setError('')
    if (!tosAccepted || !privacyAccepted) {
      setError('Please accept both the Terms of Service and Privacy Policy to continue.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/tutor/complete-onboarding', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete setup')
      router.push('/tutor')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Welcome to Pocketnote</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Let&apos;s get your profile set up before you start tutoring.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 1: Profile ── */}
      {step === 1 && (
        <div className="space-y-6">

          {/* Photo */}
          <section className="bg-white rounded-lg border border-border p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Profile photo <span className="text-destructive">*</span>
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-muted-foreground">{tutor.legal_name?.[0]?.toUpperCase() ?? '?'}</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  disabled={photoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG · shown to families and on your profile</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="bg-white rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Your details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal name">
                <p className="text-sm py-2 px-3 bg-muted/40 rounded-md">{tutor.legal_name}</p>
              </Field>
              <Field label="Email">
                <p className="text-sm py-2 px-3 bg-muted/40 rounded-md">{tutor.email}</p>
              </Field>
              <Field label="Phone" required>
                <input type="tel" className="input" placeholder="0400 000 000" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Suburb">
                <input type="text" className="input" placeholder="e.g. Bondi" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </Field>
              <Field label="State">
                <select className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  <option value="">Select state</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Postcode">
                <input type="text" className="input" placeholder="e.g. 2026" value={form.postcode}
                  onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} />
              </Field>
              <Field label="Home address" className="sm:col-span-2">
                <input type="text" className="input" placeholder="Street address" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </Field>
            </div>
            <Field label="Bio" required>
              <textarea rows={4} className="input resize-none"
                placeholder="A short intro about yourself — your teaching style, experience, and what you enjoy helping students with."
                value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </Field>
          </section>

          {/* Compliance */}
          <section className="bg-white rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Compliance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ABN" required>
                <div className="flex gap-2">
                  <input type="text" className="input flex-1" placeholder="e.g. 12 345 678 901" value={form.abn}
                    onChange={e => {
                      setForm(f => ({ ...f, abn: e.target.value }))
                      setAbnStatus({ state: 'idle' })
                    }} />
                  <button type="button" onClick={verifyAbn} disabled={!form.abn.trim() || abnStatus.state === 'loading'}
                    className="px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50 shrink-0">
                    {abnStatus.state === 'loading' ? '…' : 'Verify'}
                  </button>
                </div>
                {abnStatus.state === 'valid' && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-green-600">✓ {abnStatus.name} · Active</p>
                    <p className="text-xs text-muted-foreground">
                      GST registered: <span className={abnStatus.gstRegistered ? 'text-green-600 font-medium' : 'text-foreground font-medium'}>
                        {abnStatus.gstRegistered ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                )}
                {abnStatus.state === 'invalid' && (
                  <p className="text-xs text-destructive mt-1">ABN not found or cancelled</p>
                )}
              </Field>
              <Field label="WWCC number" required>
                <input type="text" className="input" placeholder="e.g. WWC0123456E" value={form.wwcc_number}
                  onChange={e => setForm(f => ({ ...f, wwcc_number: e.target.value }))} />
              </Field>
              <Field label="WWCC expiry" required>
                <input type="date" className="input" value={form.wwcc_expiry}
                  onChange={e => setForm(f => ({ ...f, wwcc_expiry: e.target.value }))} />
              </Field>
            </div>
          </section>

          {/* What you teach */}
          <section className="bg-white rounded-lg border border-border p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you teach</h2>

            <div>
              <p className="text-sm font-medium mb-2">Subjects <span className="text-destructive">*</span></p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, subjects: toggle(f.subjects, s) }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      form.subjects.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white border-border hover:border-primary'
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Year levels <span className="text-destructive">*</span></p>
              <div className="flex flex-wrap gap-2">
                {YEAR_LEVELS.map(y => (
                  <button key={y} type="button"
                    onClick={() => setForm(f => ({ ...f, year_levels: toggle(f.year_levels, y) }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      form.year_levels.includes(y)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white border-border hover:border-primary'
                    }`}>{y}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Credentials</p>
              <p className="text-xs text-muted-foreground mb-3">Your degrees, diplomas, or relevant qualifications.</p>
              <div className="flex gap-2 mb-3">
                <input type="text" className="input flex-1" placeholder="e.g. Bachelor of Education, UNSW"
                  value={credInput}
                  onChange={e => setCredInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCredential() } }} />
                <button type="button" onClick={addCredential}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">
                  Add
                </button>
              </div>
              {form.credentials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.credentials.map(c => (
                    <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary border border-border">
                      {c}
                      <button type="button" onClick={() => removeCredential(c)}
                        className="text-muted-foreground hover:text-foreground leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button onClick={handleProfileNext} disabled={saving || photoUploading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Next: Availability →'}
          </button>
        </div>
      )}

      {/* ── Step 2: Availability ── */}
      {step === 2 && (
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold mb-1">When are you available to tutor?</h2>
            <p className="text-xs text-muted-foreground mb-5">Add at least one slot. You can always update this later.</p>
            <AvailabilityGrid initialSlots={initialSlots} onSlotsChange={setSlotCount} />
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => { setError(''); setStep(1) }}
              className="flex-1 py-3 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">
              ← Back
            </button>
            <button onClick={handleAvailabilityNext}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90">
              Next: Agreement →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Agreement ── */}
      {step === 3 && (
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-border p-6 space-y-5">
            <h2 className="text-sm font-semibold">Almost done — please read and accept our policies</h2>
            <p className="text-sm text-muted-foreground">
              By using the Pocketnote portal you agree to be bound by our terms and privacy policy.
              Please read them before ticking the boxes below.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)}
                  className="mt-0.5 accent-primary h-4 w-4 shrink-0" />
                <span className="text-sm">
                  I have read and agree to the{' '}
                  <a href="https://pocketnote.com.au/terms" target="_blank" rel="noopener noreferrer"
                    className="text-primary underline hover:opacity-80">
                    Terms of Service
                  </a>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 accent-primary h-4 w-4 shrink-0" />
                <span className="text-sm">
                  I have read and agree to the{' '}
                  <a href="https://pocketnote.com.au/privacy" target="_blank" rel="noopener noreferrer"
                    className="text-primary underline hover:opacity-80">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => { setError(''); setStep(2) }}
              className="flex-1 py-3 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">
              ← Back
            </button>
            <button onClick={handleComplete} disabled={saving}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Completing setup…' : 'Complete setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
