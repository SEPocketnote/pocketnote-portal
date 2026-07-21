'use client'

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

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="text-primary font-bold text-lg tracking-tight">Pocketnote</span>
        <nav className="flex gap-1">
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
      <span className="text-sm text-muted-foreground">{name}</span>
    </header>
  )
}
