'use client'

import { useState, useEffect, useRef } from 'react'

export type SuburbResult = { suburb: string; state: string; postcode: string }

export default function SuburbAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'e.g. Bondi',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: SuburbResult) => void
  placeholder?: string
  className?: string
}) {
  const [results, setResults] = useState<SuburbResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/suburbs?q=${encodeURIComponent(value)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setOpen(data.length > 0)
        setActiveIndex(-1)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); pick(results[activeIndex]) }
    if (e.key === 'Escape') setOpen(false)
  }

  function pick(r: SuburbResult) {
    justSelectedRef.current = true
    onChange(r.suburb)
    onSelect(r)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className || 'input'}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <li
              key={`${r.suburb}-${r.postcode}`}
              onMouseDown={() => pick(r)}
              className={`px-4 py-2.5 text-sm cursor-pointer flex justify-between items-center gap-3 ${
                i === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
              }`}
            >
              <span>{r.suburb}</span>
              <span className="text-muted-foreground text-xs shrink-0">{r.state} {r.postcode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
