'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Users2, DollarSign, MessageSquare,
  Clock, UserCircle, LogOut, BookOpen, HelpCircle,
} from 'lucide-react'
import type { DriveStep } from 'driver.js'

const links = [
  { href: '/tutor', label: 'My Sessions', icon: CalendarDays, exact: true, tourId: 'tour-tutor-sessions' },
  { href: '/tutor/students', label: 'Students', icon: Users2, tourId: 'tour-tutor-students' },
  { href: '/tutor/earnings', label: 'Earnings', icon: DollarSign, tourId: 'tour-tutor-earnings' },
  { href: '/tutor/messages', label: 'Messages', icon: MessageSquare, tourId: 'tour-tutor-messages' },
  { href: '/tutor/availability', label: 'Availability', icon: Clock, tourId: 'tour-tutor-availability' },
  { href: '/tutor/profile', label: 'My Profile', icon: UserCircle, tourId: 'tour-tutor-profile' },
  { href: '/tutor/resources', label: 'Resources', icon: BookOpen, tourId: 'tour-tutor-resources' },
]

const TOUR_KEY = 'pn_tour_tutor'

const TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-tutor-sessions',
    popover: {
      title: 'Your sessions',
      description: 'See all upcoming sessions here. After each one happens, mark it complete so your earnings are recorded.',
      side: 'right', align: 'center',
    },
  },
  {
    element: '#tour-tutor-students',
    popover: {
      title: 'Students',
      description: 'View all your active students, their session history, and parent contact details.',
      side: 'right', align: 'center',
    },
  },
  {
    element: '#tour-tutor-earnings',
    popover: {
      title: 'Earnings',
      description: 'Track your session earnings and submit invoices for payment from here.',
      side: 'right', align: 'center',
    },
  },
  {
    element: '#tour-tutor-messages',
    popover: {
      title: 'Messages',
      description: 'Stay in touch with parents directly. They get an email notification when you reply.',
      side: 'right', align: 'center',
    },
  },
  {
    element: '#tour-tutor-availability',
    popover: {
      title: 'Availability',
      description: 'Set the days and times you\'re available to teach so admin can schedule sessions that work for you.',
      side: 'right', align: 'center',
    },
  },
  {
    element: '#tour-tutor-profile',
    popover: {
      title: 'Your profile',
      description: 'Update your photo, bio, subjects, and contact details. Parents see this when they\'re matched with you.',
      side: 'right', align: 'center',
    },
  },
]

function useTour() {
  const startTour = useCallback(async () => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return
    const { driver } = await import('driver.js')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — CSS has no type declarations
    await import('driver.js/dist/driver.css')
    const d = driver({
      animate: true,
      overlayOpacity: 0.25,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it',
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, '1')
        d.destroy()
      },
    })
    d.drive()
  }, [])

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return
    const t = setTimeout(startTour, 800)
    return () => clearTimeout(t)
  }, [startTour])

  return startTour
}

export default function TutorNav({ name, photoUrl, unreadMessages = 0 }: { name: string; photoUrl?: string | null; unreadMessages?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const replayTour = useTour()

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
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
          {photoUrl
            ? <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            : <span className="text-white font-semibold text-sm">{initial}</span>
          }
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{name}</p>
          <span className="text-white/60 text-xs">Tutor</span>
        </div>
      </div>

      <div className="h-px bg-white/20 mb-4" />

      {/* Main nav */}
      <nav className="space-y-0.5 flex-1 min-h-0">
        {links.map(({ href, label, icon: Icon, exact, tourId }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          const isMessages = href === '/tutor/messages'
          return (
            <Link
              key={href}
              id={tourId}
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
      <div className="mt-6 pt-4 border-t border-white/20 space-y-0.5">
        <button
          onClick={replayTour}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/20 hover:text-white transition-colors"
          title="Replay feature tour"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          Feature tour
        </button>
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
