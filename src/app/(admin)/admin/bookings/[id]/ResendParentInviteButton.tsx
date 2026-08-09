'use client'

import { useState } from 'react'

export default function ResendParentInviteButton({ parentId, name, hasAccount = true }: {
  parentId: string
  name: string
  hasAccount?: boolean
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setState('sending')
    await fetch(`/api/admin/parents/${parentId}/invite`, { method: 'POST' })
    setState('sent')
    setTimeout(() => setState('idle'), 3000)
  }

  const idleLabel = hasAccount ? 'Resend invite' : 'Send invite'

  return (
    <button type="button" onClick={resend} disabled={state !== 'idle'}
      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
      {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : idleLabel}
    </button>
  )
}
