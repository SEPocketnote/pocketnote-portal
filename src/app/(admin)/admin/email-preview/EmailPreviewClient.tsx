'use client'

import { useState } from 'react'

export type EmailPreview = {
  id: string
  group: string
  label: string
  subject: string
  recipient: string
  html: string
}

export default function EmailPreviewClient({ emails }: { emails: EmailPreview[] }) {
  const [selected, setSelected] = useState(0)
  const current = emails[selected]
  const groups = [...new Set(emails.map(e => e.group))]

  return (
    <div className="flex -m-6 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col overflow-hidden bg-muted/20">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email previews</p>
          <p className="text-xs text-muted-foreground mt-0.5">{emails.length} templates</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map(group => (
            <div key={group} className="mb-1">
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group}
              </p>
              {emails
                .map((e, i) => ({ e, i }))
                .filter(({ e }) => e.group === group)
                .map(({ e, i }) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(i)}
                    className={`block w-full text-left px-3 py-1.5 text-xs leading-snug rounded transition-colors mx-0 ${
                      i === selected
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/10 flex items-start gap-6 shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</span>
            <p className="text-xs text-foreground mt-0.5">{current.recipient}</p>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</span>
            <p className="text-xs font-medium text-foreground mt-0.5">{current.subject}</p>
          </div>
          <div className="text-[10px] text-muted-foreground bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1 shrink-0">
            Preview only — sample data
          </div>
        </div>
        <iframe
          key={selected}
          srcDoc={current.html}
          title={current.label}
          sandbox="allow-same-origin"
          className="flex-1 w-full border-0"
        />
      </div>
    </div>
  )
}
