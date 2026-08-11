'use client'

import { useState, useEffect, useRef } from 'react'

type AddressResult = {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
}

type NominatimResult = AddressResult & { display: string }

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing a street address…',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  onSelect: (result: AddressResult) => void
  placeholder?: string
  className?: string
}) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 4) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/address-search?q=${encodeURIComponent(value)}`)
      if (res.ok) {
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
        setActiveIndex(-1)
      }
    }, 400)
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

  function pick(r: NominatimResult) {
    justSelectedRef.current = true
    onChange(r.streetAddress)
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
              key={r.display}
              onMouseDown={() => pick(r)}
              className={`px-4 py-2.5 text-sm cursor-pointer ${
                i === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
              }`}
            >
              <p className="font-medium">{r.streetAddress}</p>
              <p className="text-xs text-muted-foreground">{r.suburb} {r.state} {r.postcode}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
