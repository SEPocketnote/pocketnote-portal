'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, AlertTriangle, Bell, Trash2, EyeOff, Eye } from 'lucide-react'

type Notice = {
  id: string
  message: string
  type: 'info' | 'warning' | 'action'
  active: boolean
  created_at: string
  dismissCount: number
}

const TYPE_META = {
  info:    { label: 'Info',    icon: Info,          color: 'bg-blue-100 text-blue-700' },
  warning: { label: 'Warning', icon: AlertTriangle,  color: 'bg-amber-100 text-amber-700' },
  action:  { label: 'Action',  icon: Bell,           color: 'bg-red-100 text-red-700' },
}

export default function NoticesClient({ notices: initial }: { notices: Notice[] }) {
  const router = useRouter()
  const [notices, setNotices] = useState(initial)
  const [form, setForm] = useState({ message: '', type: 'info' as Notice['type'], notify: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.message.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/notices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: form.message, type: form.type, notify: form.notify }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
    setNotices(prev => [{ ...data, dismissCount: 0 }, ...prev])
    setForm({ message: '', type: 'info' })
    setSaving(false)
    router.refresh()
  }

  async function toggleActive(n: Notice) {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !n.active }),
    })
    setNotices(prev => prev.map(x => x.id === n.id ? { ...x, active: !x.active } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return
    await fetch(`/api/admin/notices/${id}`, { method: 'DELETE' })
    setNotices(prev => prev.filter(x => x.id !== id))
  }

  const active = notices.filter(n => n.active)
  const inactive = notices.filter(n => !n.active)

  return (
    <div className="space-y-8">

      {/* Create form */}
      <section className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">New notice</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              rows={3}
              className="input resize-none w-full"
              placeholder="e.g. School holidays are coming up — please review and update your availability."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.message.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex gap-3">
              {(Object.keys(TYPE_META) as Notice['type'][]).map(t => {
                const m = TYPE_META[t]
                const Icon = m.icon
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.type === t
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={form.notify}
                onChange={e => setForm(f => ({ ...f, notify: e.target.checked }))}
              />
              <span className="text-sm font-medium">Email active tutors</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Sends a notification email to all tutors with active accounts.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={saving || !form.message.trim()}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Posting…' : 'Post notice'}
          </button>
        </form>
      </section>

      {/* Active notices */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Active ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map(n => <NoticeRow key={n.id} notice={n} onToggle={toggleActive} onDelete={handleDelete} />)}
          </div>
        </section>
      )}

      {active.length === 0 && (
        <div className="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No active notices. Create one above to broadcast a message to all tutors.
        </div>
      )}

      {/* Inactive notices */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Inactive ({inactive.length})
          </h2>
          <div className="space-y-2">
            {inactive.map(n => <NoticeRow key={n.id} notice={n} onToggle={toggleActive} onDelete={handleDelete} />)}
          </div>
        </section>
      )}

    </div>
  )
}

function NoticeRow({ notice, onToggle, onDelete }: {
  notice: Notice
  onToggle: (n: Notice) => void
  onDelete: (id: string) => void
}) {
  const m = TYPE_META[notice.type] ?? TYPE_META.info
  const Icon = m.icon
  return (
    <div className={`bg-white rounded-lg border p-4 flex items-start gap-3 ${notice.active ? 'border-border' : 'border-border opacity-60'}`}>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 shrink-0 ${m.color}`}>
        <Icon className="w-3 h-3" />
        {m.label}
      </span>
      <p className="flex-1 text-sm text-foreground leading-relaxed">{notice.message}</p>
      <div className="flex items-center gap-3 shrink-0">
        {notice.dismissCount > 0 && (
          <span className="text-xs text-muted-foreground">{notice.dismissCount} dismissed</span>
        )}
        <button
          onClick={() => onToggle(notice)}
          title={notice.active ? 'Deactivate' : 'Reactivate'}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {notice.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onDelete(notice.id)}
          title="Delete"
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
