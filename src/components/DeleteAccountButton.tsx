'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountButton({
  deleteUrl,
  redirectTo,
  name,
}: {
  deleteUrl: string
  redirectTo: string
  name: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const res = await fetch(deleteUrl, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to delete')
      setDeleting(false)
      setConfirming(false)
      return
    }
    window.location.href = redirectTo
  }

  return (
    <section className="mt-8">
      <div className="border border-red-200 rounded-lg p-5 bg-red-50/40">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently deletes this account and all associated data. This cannot be undone.
          Accounts with active bookings cannot be deleted — cancel their bookings first.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {confirming ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700 font-medium">
              Delete {name}?
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted disabled:opacity-50">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors">
            Delete account
          </button>
        )}
      </div>
    </section>
  )
}
