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
  info:    { accent: 'border-l-blue-400',   icon: Info,          iconClass: 'text-blue-500',   textClass: 'text-blue-900' },
  warning: { accent: 'border-l-amber-400',  icon: AlertTriangle, iconClass: 'text-amber-500',  textClass: 'text-amber-900' },
  action:  { accent: 'border-l-primary',    icon: Bell,          iconClass: 'text-primary',    textClass: 'text-primary' },
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
    <div className={`flex items-start gap-3 bg-white rounded-2xl shadow-sm border-l-4 px-4 py-4 ${s.accent}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconClass}`} />
      <p className={`flex-1 text-sm leading-relaxed ${s.textClass}`}>{notice.message}</p>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="shrink-0 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
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
    <div className="space-y-2">
      {shown.map(n => (
        <Banner key={n.id} notice={n} onDismiss={dismiss} />
      ))}
    </div>
  )
}
