'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Users2, DollarSign, MessageSquare,
  Clock, UserCircle, LogOut, BookOpen,
} from 'lucide-react'

const links = [
  { href: '/tutor', label: 'My Sessions', icon: CalendarDays, exact: true },
  { href: '/tutor/students', label: 'Students', icon: Users2 },
  { href: '/tutor/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/tutor/messages', label: 'Messages', icon: MessageSquare },
  { href: '/tutor/availability', label: 'Availability', icon: Clock },
  { href: '/tutor/profile', label: 'My Profile', icon: UserCircle },
  { href: '/tutor/resources', label: 'Resources', icon: BookOpen },
]

export default function TutorNav({ name, unreadMessages = 0 }: { name: string; unreadMessages?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = name ? name[0].toUpperCase() : 'T'

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
          <p className="text-white text-sm font-medium truncate">{name}</p>
          <span className="text-white/60 text-xs">Tutor</span>
        </div>
      </div>

      <div className="h-px bg-white/20 mb-4" />

      {/* Main nav */}
      <nav className="space-y-0.5 flex-1 min-h-0">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          const isMessages = href === '/tutor/messages'
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
              {isMessages && unreadMessages > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 bg-white text-primary text-[10px] rounded-full font-bold">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-6 pt-4 border-t border-white/20">
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
