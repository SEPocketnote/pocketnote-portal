'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export default function EnquirySearch({
  defaultValue,
  baseParams,
}: {
  defaultValue?: string
  baseParams: Record<string, string>
}) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout>>()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timer.current)
    const q = e.target.value
    timer.current = setTimeout(() => {
      const params = { ...baseParams }
      if (q) params.q = q
      else delete params.q
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
      router.push(`/admin/enquiries${qs ? `?${qs}` : ''}`)
    }, 300)
  }

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Search parent name or email…"
      className="input w-64"
    />
  )
}
