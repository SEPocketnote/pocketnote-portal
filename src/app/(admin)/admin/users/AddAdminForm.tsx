'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddAdminForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const json = await res.json()

    if (!res.ok) {
      setStatus('error')
      setMessage(json.error ?? 'Something went wrong')
      return
    }

    setStatus('success')
    setMessage(
      json.alreadyExisted
        ? `${email} already had an account — updated to admin.`
        : `Invite sent to ${email}. Also add this email to the ADMIN_EMAILS environment variable so they can sign in after the invite expires.`
    )
    setEmail('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
      >
        + Add admin
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="admin@email.com"
        required
        className="border border-border rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'Sending…' : 'Send invite'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus('idle'); setMessage('') }}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-1 sm:mt-0 ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
