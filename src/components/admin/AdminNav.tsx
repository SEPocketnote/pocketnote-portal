'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/tutors', label: 'Tutors' },
  { href: '/admin/payments', label: 'Payments' },
]

const previewLinks = [
  { href: '/parent', label: 'Parent portal' },
  { href: '/tutor', label: 'Tutor portal' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-white min-h-screen px-4 py-6">
      <div className="mb-8">
        <span className="text-primary font-bold text-lg tracking-tight">Pocketnote</span>
        <span className="block text-xs text-muted-foreground">Admin</span>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-secondary text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </Link>
          )
        })}
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
    </aside>
  )
}
