'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Inbox, CalendarDays, Users2,
  MessageSquare, CreditCard, UserCog, Settings,
  LogOut, ExternalLink,
} from 'lucide-react'

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/tutors', label: 'Tutors', icon: Users2 },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/users', label: 'Users', icon: UserCog },
]

const previewLinks = [
  { href: '/parent', label: 'Parent portal' },
  { href: '/tutor', label: 'Tutor portal' },
]

export default function AdminNav({ email }: { email?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = email ? email[0].toUpperCase() : 'A'

  const navContent = (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="mb-6 px-1">
        <span className="text-white font-bold text-xl tracking-tight">Pocketnote</span>
      </div>

      {/* User identity */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-sm">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{email ?? 'Admin'}</p>
          <span className="text-white/60 text-xs">Admin</span>
        </div>
      </div>

      <div className="h-px bg-white/20 mb-4" />

      {/* Main nav */}
      <nav className="space-y-0.5 flex-1 min-h-0">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-white text-primary' : 'text-white/90 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-white/70'}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Preview links */}
      <div className="mt-6">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Preview</p>
        {previewLinks.map(({ href, label }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <ExternalLink className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 pt-4 border-t border-white/20 space-y-0.5">
        {(() => {
          const active = pathname.startsWith('/admin/settings')
          return (
            <Link href="/admin/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-white text-primary' : 'text-white/90 hover:bg-white/20 hover:text-white'
              }`}>
              <Settings className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-white/70'}`} />
              Settings
            </Link>
          )
        })()}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-primary sticky top-0 h-screen px-4 py-6 overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-primary h-14 px-4 flex items-center justify-between">
        <span className="text-white font-bold text-base tracking-tight">Pocketnote</span>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white" aria-label="Open navigation">
          <BurgerIcon />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-72 bg-primary min-h-screen px-4 py-6 shadow-xl flex flex-col overflow-y-auto">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors" aria-label="Close navigation">
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
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
