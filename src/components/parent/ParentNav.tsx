'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/parent', label: 'My Sessions', exact: true },
  { href: '/parent/progress', label: 'Progress Reports' },
  { href: '/parent/messages', label: 'Messages' },
  { href: '/parent/account', label: 'Account' },
]

export default function ParentNav({ name, unreadMessages = 0 }: { name: string; unreadMessages?: number }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <header className="bg-white border-b border-border relative z-20">
      {/* Main bar */}
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8">
          <span className="text-primary font-bold text-base sm:text-lg tracking-tight shrink-0">Pocketnote</span>
          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1">
            {links.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              const isMessages = href === '/parent/messages'
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active ? 'bg-secondary text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                  {isMessages && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full font-medium">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground">{name}</span>
          {/* Mobile burger */}
          <button
            className="sm:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <CloseIcon /> : <BurgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-white px-4 py-3 space-y-1">
          <p className="text-xs text-muted-foreground pb-1">{name}</p>
          {links.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            const isMessages = href === '/parent/messages'
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active ? 'bg-secondary text-primary' : 'text-foreground hover:bg-muted'
                }`}
              >
                {label}
                {isMessages && unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full font-medium">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}

function BurgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
