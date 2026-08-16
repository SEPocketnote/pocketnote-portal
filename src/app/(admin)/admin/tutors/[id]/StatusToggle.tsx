'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StatusToggle({ tutorId, active, verified, hasAccount, name, email }: {
  tutorId: string
  active: boolean
  verified: boolean
  hasAccount: boolean
  name: string
  email: string
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [inviteState, setInviteState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function toggle(field: 'active' | 'verified') {
    setToggling(true)
    await fetch(`/api/admin/tutors/${tutorId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [field]: field === 'active' ? !active : !verified }),
    })
    router.refresh()
    setToggling(false)
  }

  async function resend() {
    setInviteState('sending')
    await fetch('/api/admin/tutors/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    setInviteState('sent')
    setTimeout(() => setInviteState('idle'), 3000)
  }

  return (
    <section className="bg-white rounded-2xl shadow-md p-4 mt-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-medium">Portal access</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasAccount ? 'Tutor has a portal account' : 'No portal account yet'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={toggling} onClick={() => toggle('active')}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
          {active ? 'Deactivate' : 'Activate'}
        </button>
        <button type="button" disabled={toggling} onClick={() => toggle('verified')}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
          {verified ? 'Unverify' : 'Verify'}
        </button>
        <button type="button" onClick={resend} disabled={inviteState !== 'idle'}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
          {inviteState === 'sending' ? 'Sending…' : inviteState === 'sent' ? 'Sent ✓' : 'Resend invite'}
        </button>
      </div>
    </section>
  )
}
