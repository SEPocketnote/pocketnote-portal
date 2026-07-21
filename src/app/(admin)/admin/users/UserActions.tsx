'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RemoveAdminButton({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    if (!confirm('Remove admin access? They will be downgraded to a parent account.')) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_admin' }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handle}
      disabled={loading || isSelf}
      title={isSelf ? 'Cannot remove your own access' : 'Remove admin access'}
      className="text-xs text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? 'Removing…' : 'Remove'}
    </button>
  )
}

export function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    const action = banned ? 'unban' : 'ban'
    const msg = banned ? 'Restore access for this user?' : 'Ban this user? They will not be able to sign in.'
    if (!confirm(msg)) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`text-xs hover:underline disabled:opacity-40 ${banned ? 'text-green-700' : 'text-muted-foreground'}`}
    >
      {loading ? '…' : banned ? 'Unban' : 'Ban'}
    </button>
  )
}
