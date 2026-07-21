'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/tutors', label: 'Tutors' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/payments', label: 'Payments' },
]

const previewLinks = [
  { href: '/parent', label: 'Parent portal' },
  { href: '/tutor', label: 'Tutor portal' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const navLink = (href: string, label: string, exact?: boolean, extra?: string) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active ? 'bg-secondary text-primary' : 'text-foreground hover:bg-muted'
        } ${extra ?? ''}`}
      >
        {label}
      </Link>
    )
  }

  const navContent = (
    <>
      <div className="mb-8">
        <span className="text-primary font-bold text-lg tracking-tight">Pocketnote</span>
        <span className="block text-xs text-muted-foreground">Admin</span>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, exact }) => navLink(href, label, exact))}
      </nav>
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 mb-2">
          Preview
        </p>
        <nav className="space-y-1">
          {previewLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              {label} ↗
            </Link>
          ))}
        </nav>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-white min-h-screen px-4 py-6">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-border h-14 px-4 flex items-center justify-between">
        <div>
          <span className="text-primary font-bold text-base tracking-tight">Pocketnote</span>
          <span className="text-xs text-muted-foreground ml-2">Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Open navigation"
        >
          <BurgerIcon />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 w-64 bg-white min-h-screen px-4 py-6 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
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
