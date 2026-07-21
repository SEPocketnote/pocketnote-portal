'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/tutor', label: 'My Sessions', exact: true },
  { href: '/tutor/students', label: 'Students' },
  { href: '/tutor/earnings', label: 'Earnings' },
  { href: '/tutor/availability', label: 'Availability' },
  { href: '/tutor/profile', label: 'My Profile' },
]

export default function TutorNav({ name }: { name: string }) {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="text-primary font-bold text-lg tracking-tight">Pocketnote</span>
        <nav className="flex gap-1">
          {links.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active ? 'bg-secondary text-primary' : 'text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <span className="text-sm text-muted-foreground">{name}</span>
    </header>
  )
}
