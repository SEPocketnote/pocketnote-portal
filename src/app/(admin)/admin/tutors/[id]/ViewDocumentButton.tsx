'use client'

import { useState } from 'react'

export default function ViewDocumentButton({ tutorId, type, label }: {
  tutorId: string
  type: 'licence' | 'wwcc'
  label: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleView() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tutors/${tutorId}/documents?type=${type}`)
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        alert(data.error ?? 'Could not load document')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleView}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
    >
      {loading ? 'Loading…' : label}
    </button>
  )
}
