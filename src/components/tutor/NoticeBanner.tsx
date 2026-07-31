'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, AlertTriangle, Bell, X } from 'lucide-react'

type Notice = {
  id: string
  message: string
  type: 'info' | 'warning' | 'action'
}

const STYLES = {
  info:    { wrap: 'bg-blue-50 border-blue-200 text-blue-800',    icon: Info,          iconClass: 'text-blue-500' },
  warning: { wrap: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle, iconClass: 'text-amber-500' },
  action:  { wrap: 'bg-primary/5 border-primary/30 text-primary', icon: Bell,          iconClass: 'text-primary' },
}

function Banner({ notice, onDismiss }: { notice: Notice; onDismiss: (id: string) => void }) {
  const [dismissing, setDismissing] = useState(false)
  const s = STYLES[notice.type] ?? STYLES.info
  const Icon = s.icon

  async function handleDismiss() {
    setDismissing(true)
    await fetch(`/api/tutor/notices/${notice.id}/dismiss`, { method: 'POST' })
    onDismiss(notice.id)
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.wrap}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconClass}`} />
      <p className="flex-1 text-sm leading-relaxed">{notice.message}</p>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function NoticeBanners({ notices }: { notices: Notice[] }) {
  const router = useRouter()
  const [visible, setVisible] = useState(notices.map(n => n.id))

  function dismiss(id: string) {
    setVisible(v => v.filter(x => x !== id))
    router.refresh()
  }

  const shown = notices.filter(n => visible.includes(n.id))
  if (!shown.length) return null

  return (
    <div className="space-y-2 mb-6">
      {shown.map(n => (
        <Banner key={n.id} notice={n} onDismiss={dismiss} />
      ))}
    </div>
  )
}
