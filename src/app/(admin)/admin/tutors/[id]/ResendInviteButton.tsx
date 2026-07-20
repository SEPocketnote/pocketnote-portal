'use client'

import { useState } from 'react'

export default function ResendInviteButton({ tutorId, name, email }: {
  tutorId: string
  name: string
  email: string
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setState('sending')
    await fetch('/api/admin/tutors/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    setState('sent')
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <button type="button" onClick={resend} disabled={state !== 'idle'}
      className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
      {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : 'Resend invite'}
    </button>
  )
}
