'use client'

import { useState, useEffect, useRef } from 'react'

export type StudentResult = {
  id: string
  name: string
  year_level: string | null
  subjects: string[]
}

export type ParentResult = {
  id: string
  name: string
  email: string
  phone: string | null
  students: StudentResult[]
}

export default function ParentSearch({
  onSelect,
  onCreateNew,
  initialQuery,
  initialPrefill,
}: {
  onSelect: (parent: ParentResult) => void
  onCreateNew: (prefill: { name: string; email: string; phone: string }) => void
  initialQuery?: string
  initialPrefill?: { name: string; email: string; phone: string }
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ParentResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const didAutoSearch = useRef(false)

  useEffect(() => {
    if (initialQuery && !didAutoSearch.current) {
      didAutoSearch.current = true
      setQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/parents/search?q=${encodeURIComponent(query)}`)
      const data: ParentResult[] = res.ok ? await res.json() : []
      setResults(data)
      setSearched(true)
      setLoading(false)
      const hasMeaningfulPrefill = !!(initialPrefill?.email || initialPrefill?.name)
      if (data.length === 0 && hasMeaningfulPrefill) {
        // Enquiry pre-fill with no match — auto-switch to create mode
        onCreateNew(initialPrefill!)
      } else {
        setOpen(true)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleCreateNew() {
    setOpen(false)
    setSearched(false)
    const isEmail = query.includes('@')
    onCreateNew({
      name: isEmail ? '' : query,
      email: isEmail ? query : '',
      phone: '',
    })
  }

  const showDropdown = open || (searched && !loading && query.length >= 2)

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setSearched(false) }}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="input"
        placeholder="Search by parent name or email…"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Searching…
        </span>
      )}
      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map(p => (
            <li
              key={p.id}
              onMouseDown={() => { setOpen(false); onSelect(p) }}
              className="px-4 py-3 text-sm cursor-pointer hover:bg-muted/50 flex justify-between items-start gap-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </div>
              {p.students.length > 0 && (
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                  {p.students.length} student{p.students.length !== 1 ? 's' : ''}
                </span>
              )}
            </li>
          ))}
          {results.length === 0 && searched && (
            <li className="px-4 py-3 text-sm text-muted-foreground">No parents found</li>
          )}
          <li
            onMouseDown={handleCreateNew}
            className="px-4 py-3 text-sm cursor-pointer hover:bg-muted/50 border-t border-border text-primary font-medium"
          >
            + Create new parent
          </li>
        </ul>
      )}
    </div>
  )
}
