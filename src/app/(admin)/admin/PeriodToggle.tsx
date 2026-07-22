'use client'

import { useRouter } from 'next/navigation'

const OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: 'fortnight', label: 'Fortnight' },
  { key: 'month', label: 'Month' },
] as const

export default function PeriodToggle({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex rounded-md border border-border p-0.5 bg-muted/30 gap-0.5">
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => router.push(`/admin?period=${key}`)}
          className={`text-xs px-2.5 py-1 rounded transition-colors ${
            current === key
              ? 'bg-white shadow-sm text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
