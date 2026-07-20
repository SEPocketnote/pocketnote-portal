'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StatusToggle({ tutorId, active, verified }: {
  tutorId: string
  active: boolean
  verified: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle(field: 'active' | 'verified') {
    setLoading(true)
    await fetch(`/api/admin/tutors/${tutorId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [field]: field === 'active' ? !active : !verified }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg border border-border p-4 flex flex-wrap gap-3">
      <button type="button" disabled={loading} onClick={() => toggle('active')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
          active
            ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}>
        {active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      </button>
      <button type="button" disabled={loading} onClick={() => toggle('verified')}
        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
          verified
            ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}>
        {verified ? 'Verified — click to unverify' : 'Unverified — click to verify'}
      </button>
    </div>
  )
}
