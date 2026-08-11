'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SUBJECTS = ['Maths', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Legal Studies', 'Music', 'Art']
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']
const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']

export default function ProfileForm({ tutor }: { tutor: any }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [credInput, setCredInput] = useState('')
  const [abnStatus, setAbnStatus] = useState<{ state: 'idle' | 'loading' | 'valid' | 'invalid'; name?: string; gstRegistered?: boolean }>({ state: 'idle' })
  const [bankTouched, setBankTouched] = useState({ bsb: false, account_number: false, account_name: false })

  const bankDetails = tutor.bank_details as { account_name?: string; bsb?: string; account_number?: string } | null
  const superDetails = tutor.super_details as { fund_name?: string; fund_abn?: string; usi?: string; member_number?: string } | null

  const [form, setForm] = useState({
    phone: tutor.phone ?? '',
    preferred_name: tutor.preferred_name ?? '',
    address: tutor.address ?? '',
    bio: tutor.bio ?? '',
    abn: tutor.abn ?? '',
    gst_registered: tutor.gst_registered ?? false,
    wwcc_number: tutor.wwcc_number ?? '',
    wwcc_expiry: tutor.wwcc_expiry ?? '',
    date_of_birth: tutor.date_of_birth ?? '',
    location: tutor.location ?? '',
    state: tutor.state ?? '',
    postcode: tutor.postcode ?? '',
    subjects: (tutor.subjects ?? []) as string[],
    year_levels: (tutor.year_levels ?? []) as string[],
    credentials: (tutor.credentials ?? []) as string[],
    photo_url: tutor.photo_url ?? '',
    mode: (tutor.mode ?? 'either') as string,
    bank_account_name: bankDetails?.account_name ?? '',
    bank_bsb: bankDetails?.bsb ?? '',
    bank_account_number: bankDetails?.account_number ?? '',
    super_fund_name: superDetails?.fund_name ?? '',
    super_fund_abn: superDetails?.fund_abn ?? '',
    super_usi: superDetails?.usi ?? '',
    super_member_number: superDetails?.member_number ?? '',
  })

  function formatBsb(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits
  }

  const bsbValid = /^\d{3}-\d{3}$/.test(form.bank_bsb)
  const accountNumberValid = /^\d{6,10}$/.test(form.bank_account_number.replace(/\s/g, ''))
  const anyBankField = !!(form.bank_account_name || form.bank_bsb || form.bank_account_number)

  function togglePill(field: 'subjects' | 'year_levels', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v: string) => v !== value)
        : [...f[field], value],
    }))
  }

  function addCredential() {
    const val = credInput.trim()
    if (val && !form.credentials.includes(val)) {
      setForm(f => ({ ...f, credentials: [...f.credentials, val] }))
    }
    setCredInput('')
  }

  function removeCredential(val: string) {
    setForm(f => ({ ...f, credentials: f.credentials.filter((c: string) => c !== val) }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
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
      router.refresh()
    } catch (err: any) {
      setError('Photo upload failed: ' + err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.bio.trim().length < 50) {
      setError('Bio must be at least 50 characters.')
      return
    }
    if (anyBankField) {
      if (!form.bank_account_name.trim()) { setError('Please enter the account name for your bank account.'); return }
      if (!bsbValid) { setError('BSB must be in the format XXX-XXX (6 digits).'); return }
      if (!accountNumberValid) { setError('Account number must be 6–10 digits.'); return }
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { bank_account_name, bank_bsb, bank_account_number, super_fund_name, super_fund_abn, super_usi, super_member_number, ...rest } = form
      const anySuper = !!(super_fund_name || super_fund_abn || super_usi || super_member_number)
      const payload = {
        ...rest,
        bank_details: (bank_account_name || bank_bsb || bank_account_number)
          ? { account_name: bank_account_name, bsb: bank_bsb, account_number: bank_account_number }
          : null,
        super_details: anySuper
          ? { fund_name: super_fund_name, fund_abn: super_fund_abn, usi: super_usi, member_number: super_member_number }
          : null,
      }
      const res = await fetch('/api/tutor/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Profile saved')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Identity + photo */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Profile photo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-muted-foreground">
                {tutor.legal_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div>
            <button type="button" disabled={photoUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
              {photoUploading ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG, shown to parents and on your profile</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={handlePhotoChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Legal name">
            <p className="text-sm py-2 px-3 bg-muted/40 rounded-md text-foreground">{tutor.legal_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Used on invoices. Contact Pocketnote to update.</p>
          </Field>
          <Field label="Email">
            <p className="text-sm py-2 px-3 bg-muted/40 rounded-md text-foreground">{tutor.email}</p>
          </Field>
          <Field label="Preferred name" className="sm:col-span-2">
            <input type="text" className="input" placeholder="e.g. Alex (leave blank to use legal name)"
              value={form.preferred_name}
              onChange={e => setForm({ ...form, preferred_name: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">
              If set, this is the name shown to families, on sessions, and on your public profile. Leave blank to use your legal name.
            </p>
          </Field>
          <Field label="Phone">
            <input type="tel" className="input" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Suburb">
            <input type="text" className="input" placeholder="e.g. Bondi" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="State">
            <select className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
              <option value="">Select state</option>
              {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Postcode">
            <input type="text" className="input" placeholder="e.g. 2026" value={form.postcode}
              onChange={e => setForm({ ...form, postcode: e.target.value })} />
          </Field>
          <Field label="Home address" className="sm:col-span-2">
            <input type="text" className="input" placeholder="Street address" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea rows={4} className="input resize-none"
            placeholder="A short intro about yourself, your teaching style and experience"
            value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          <p className={`text-xs mt-1 ${form.bio.trim().length >= 50 ? 'text-muted-foreground' : 'text-amber-600'}`}>
            {form.bio.trim().length}/50 minimum characters
          </p>
        </Field>
      </section>

      {/* Compliance */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance</h2>
        <p className="text-xs text-muted-foreground">Required before you can be activated on the platform.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="ABN">
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="e.g. 12 345 678 901" value={form.abn}
                onChange={e => { setForm({ ...form, abn: e.target.value }); setAbnStatus({ state: 'idle' }) }} />
              <button type="button" onClick={async () => {
                const abn = form.abn.replace(/\s/g, '')
                if (!abn) return
                setAbnStatus({ state: 'loading' })
                try {
                  const res = await fetch(`/api/admin/abn-lookup?abn=${encodeURIComponent(abn)}`)
                  const data = await res.json()
                  if (!res.ok || data.error) { setAbnStatus({ state: 'invalid' }); return }
                  const gstRegistered = data.gstRegistered ?? false
                  setAbnStatus({ state: data.status === 'Active' ? 'valid' : 'invalid', name: data.name, gstRegistered })
                  if (data.status === 'Active') setForm(f => ({ ...f, gst_registered: gstRegistered }))
                } catch { setAbnStatus({ state: 'invalid' }) }
              }} disabled={!form.abn.trim() || abnStatus.state === 'loading'}
                className="px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50 shrink-0">
                {abnStatus.state === 'loading' ? '…' : 'Verify'}
              </button>
            </div>
            {abnStatus.state === 'valid' && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-green-600">✓ {abnStatus.name}</p>
                <p className="text-xs text-muted-foreground">GST: <span className="font-medium text-foreground">{abnStatus.gstRegistered ? 'Registered' : 'Not registered'}</span></p>
              </div>
            )}
            {abnStatus.state === 'idle' && form.abn && (
              <p className="text-xs text-muted-foreground mt-1">
                GST: <span className="font-medium text-foreground">{form.gst_registered ? 'Registered' : 'Not registered'}</span>
                {' '}· <button type="button" onClick={() => {}} className="text-primary underline text-xs">verify to update</button>
              </p>
            )}
            {abnStatus.state === 'invalid' && <p className="text-xs text-destructive mt-1">ABN not found or cancelled</p>}
          </Field>
          <Field label="WWCC number">
            <input type="text" className="input" value={form.wwcc_number}
              onChange={e => setForm({ ...form, wwcc_number: e.target.value })} />
          </Field>
          <Field label="WWCC expiry">
            <input type="date" className="input" value={form.wwcc_expiry}
              onChange={e => setForm({ ...form, wwcc_expiry: e.target.value })} />
          </Field>
          <Field label="Date of birth">
            <input type="date" className="input" value={form.date_of_birth}
              onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
          <Field label="GST registered">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={form.gst_registered}
                onChange={e => setForm({ ...form, gst_registered: e.target.checked })}
              />
              <span className="text-sm">I am registered for GST</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-detected from ABN lookup — you can override this if needed.
            </p>
          </Field>
        </div>
      </section>

      {/* Payment details */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment details</h2>
          <p className="text-xs text-muted-foreground mt-1">Your bank account for receiving session payments.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Account name</label>
            <input
              type="text"
              className={`input ${bankTouched.account_name && !form.bank_account_name.trim() ? 'border-destructive' : ''}`}
              placeholder="e.g. Jane Smith"
              value={form.bank_account_name}
              onChange={e => setForm({ ...form, bank_account_name: e.target.value })}
              onBlur={() => setBankTouched(t => ({ ...t, account_name: true }))}
            />
            {bankTouched.account_name && !form.bank_account_name.trim() && (
              <p className="text-xs text-destructive mt-1">Account name is required.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">BSB</label>
            <input
              type="text"
              inputMode="numeric"
              className={`input ${bankTouched.bsb && form.bank_bsb && !bsbValid ? 'border-destructive' : ''}`}
              placeholder="e.g. 062-000"
              value={form.bank_bsb}
              onChange={e => setForm({ ...form, bank_bsb: formatBsb(e.target.value) })}
              onBlur={() => setBankTouched(t => ({ ...t, bsb: true }))}
              maxLength={7}
            />
            {bankTouched.bsb && form.bank_bsb && !bsbValid && (
              <p className="text-xs text-destructive mt-1">Must be 6 digits (e.g. 062-000).</p>
            )}
            {bsbValid && (
              <p className="text-xs text-green-600 mt-1">✓ Valid format</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account number</label>
            <input
              type="text"
              inputMode="numeric"
              className={`input ${bankTouched.account_number && form.bank_account_number && !accountNumberValid ? 'border-destructive' : ''}`}
              placeholder="e.g. 12345678"
              value={form.bank_account_number}
              onChange={e => setForm({ ...form, bank_account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              onBlur={() => setBankTouched(t => ({ ...t, account_number: true }))}
              maxLength={10}
            />
            {bankTouched.account_number && form.bank_account_number && !accountNumberValid && (
              <p className="text-xs text-destructive mt-1">Must be 6–10 digits.</p>
            )}
            {accountNumberValid && (
              <p className="text-xs text-green-600 mt-1">✓ Valid format</p>
            )}
          </div>
        </div>
      </section>

      {/* Superannuation */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Superannuation</h2>
          <p className="text-xs text-muted-foreground mt-1">Your super fund details for payment processing.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Fund name</label>
            <input type="text" className="input" placeholder="e.g. Australian Super"
              value={form.super_fund_name}
              onChange={e => setForm({ ...form, super_fund_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fund ABN</label>
            <input type="text" className="input" placeholder="e.g. 65 714 394 898"
              value={form.super_fund_abn}
              onChange={e => setForm({ ...form, super_fund_abn: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">USI (Unique Superannuation Identifier)</label>
            <input type="text" className="input" placeholder="e.g. STA0100AU"
              value={form.super_usi}
              onChange={e => setForm({ ...form, super_usi: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Member number</label>
            <input type="text" className="input" placeholder="e.g. 123456789"
              value={form.super_member_number}
              onChange={e => setForm({ ...form, super_member_number: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Session mode */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session mode</h2>
        <Field label="How do you offer sessions?">
          <select className="input" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
            <option value="either">Online & in-person</option>
            <option value="online">Online only</option>
            <option value="in-person">In-person only</option>
          </select>
        </Field>
      </section>

      {/* Subjects, year levels & credentials */}
      <section className="bg-white rounded-lg border border-border p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you teach</h2>

        <div>
          <p className="text-sm font-medium mb-2">Subjects</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} type="button" onClick={() => togglePill('subjects', s)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.subjects.includes(s)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Year levels</p>
          <div className="flex flex-wrap gap-2">
            {YEAR_LEVELS.map(y => (
              <button key={y} type="button" onClick={() => togglePill('year_levels', y)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.year_levels.includes(y)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary'
                }`}>
                {y}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Credentials</p>
          <p className="text-xs text-muted-foreground mb-3">Add your degrees, diplomas, or relevant qualifications.</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              className="input flex-1"
              placeholder="e.g. Bachelor of Science, UNSW"
              value={credInput}
              onChange={e => setCredInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCredential() } }}
            />
            <button type="button" onClick={addCredential}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">
              Add
            </button>
          </div>
          {form.credentials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.credentials.map((c: string) => (
                <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary text-foreground border border-border">
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
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button type="submit" disabled={saving}
        className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
