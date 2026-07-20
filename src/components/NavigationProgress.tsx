'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function ProgressBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)

  // Start bar on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a')
      if (
        anchor?.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target &&
        !e.metaKey && !e.ctrlKey
      ) {
        setVisible(true)
        setWidth(30)
        setTimeout(() => setWidth(70), 100)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Complete bar when route changes
  useEffect(() => {
    setWidth(100)
    const t1 = setTimeout(() => setVisible(false), 300)
    const t2 = setTimeout(() => setWidth(0), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function NavigationProgress() {
  return (
    <Suspense>
      <ProgressBarInner />
    </Suspense>
  )
}
