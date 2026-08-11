'use client'

import { useState, useMemo } from 'react'

const DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Tutor = {
  id: string
  legal_name: string
  preferred_name?: string | null
  location: string | null
  state: string | null
  postcode: string | null
  subjects: string[]
  year_levels: string[]
  mode: string | null
}

type AvailabilityRow = { tutor_id: string; day_of_week: number }

export default function TutorPicker({
  tutors,
  availability,
  value,
  onChange,
  bookingMode,
}: {
  tutors: Tutor[]
  availability: AvailabilityRow[]
  value: string
  onChange: (id: string) => void
  bookingMode?: 'online' | 'in-person'
}) {
  const [locationFilter, setLocationFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  const availByTutor = useMemo(() => {
    const map: Record<string, number[]> = {}
    for (const row of availability) {
      if (!map[row.tutor_id]) map[row.tutor_id] = []
      if (!map[row.tutor_id].includes(row.day_of_week)) {
        map[row.tutor_id].push(row.day_of_week)
      }
    }
    return map
  }, [availability])

  const allSubjects = useMemo(() => {
    const set = new Set<string>()
    for (const t of tutors) t.subjects?.forEach(s => set.add(s))
    return Array.from(set).sort()
  }, [tutors])

  const locStr = locationFilter.trim().toLowerCase()
  const hasAnyFilter = !!(locStr || subjectFilter || dayFilter)

  // Hard-filter by booking mode (completely hidden)
  const { modeCompatible, modeExcluded } = useMemo(() => {
    if (!bookingMode) return { modeCompatible: tutors, modeExcluded: [] }
    return tutors.reduce<{ modeCompatible: Tutor[]; modeExcluded: Tutor[] }>(
      (acc, t) => {
        const tm = t.mode ?? 'either'
        const excluded =
          (bookingMode === 'in-person' && tm === 'online') ||
          (bookingMode === 'online' && tm === 'in-person')
        if (excluded) acc.modeExcluded.push(t)
        else acc.modeCompatible.push(t)
        return acc
      },
      { modeCompatible: [], modeExcluded: [] }
    )
  }, [tutors, bookingMode])

  // Soft filters within mode-compatible set
  const { matched, others } = useMemo(() => {
    if (!hasAnyFilter) return { matched: [] as Tutor[], others: modeCompatible }
    const matched: Tutor[] = []
    const others: Tutor[] = []
    for (const t of modeCompatible) {
      let ok = true
      if (locStr) {
        const s = [t.location, t.state, t.postcode].filter(Boolean).join(' ').toLowerCase()
        if (!s.includes(locStr)) ok = false
      }
      if (subjectFilter && ok) {
        if (!t.subjects?.includes(subjectFilter)) ok = false
      }
      if (dayFilter && ok) {
        if (!availByTutor[t.id]?.includes(parseInt(dayFilter))) ok = false
      }
      if (ok) matched.push(t)
      else others.push(t)
    }
    return { matched, others }
  }, [modeCompatible, locStr, subjectFilter, dayFilter, availByTutor, hasAnyFilter])

  // When filtering: show matched + optionally others. When not filtering: show all.
  const primaryList = hasAnyFilter ? matched : modeCompatible
  const secondaryList = hasAnyFilter && showAll ? others : []

  function clearFilters() {
    setLocationFilter('')
    setSubjectFilter('')
    setDayFilter('')
    setShowAll(false)
  }

  const activeFilterCount = [locStr, subjectFilter, dayFilter].filter(Boolean).length

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          className="input text-sm"
          placeholder="Filter by area…"
          value={locationFilter}
          onChange={e => { setLocationFilter(e.target.value); setShowAll(false) }}
        />
        <select
          className="input text-sm"
          value={subjectFilter}
          onChange={e => { setSubjectFilter(e.target.value); setShowAll(false) }}
        >
          <option value="">Any subject</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="input text-sm"
          value={dayFilter}
          onChange={e => { setDayFilter(e.target.value); setShowAll(false) }}
        >
          <option value="">Any day</option>
          {DAY_ORDER.map(d => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button type="button" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary">
          Clear filters
        </button>
      )}

      {bookingMode && modeExcluded.length > 0 && (
        <p className="text-xs text-amber-600">
          {modeExcluded.length} tutor{modeExcluded.length !== 1 ? 's' : ''} hidden ({bookingMode === 'in-person' ? 'online only' : 'in-person only'})
        </p>
      )}

      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {hasAnyFilter && matched.length > 0 && (
          <div className="px-3 py-1.5 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Matching tutors ({matched.length})
          </div>
        )}

        {primaryList.map(t => (
          <TutorRow
            key={t.id}
            tutor={t}
            days={availByTutor[t.id] ?? []}
            selected={value === t.id}
            onSelect={() => onChange(t.id)}
          />
        ))}

        {hasAnyFilter && matched.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">No tutors match these filters.</p>
            {!showAll && others.length > 0 && (
              <button type="button" onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline">
                Show all {others.length} tutors
              </button>
            )}
          </div>
        )}

        {hasAnyFilter && others.length > 0 && (
          <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {matched.length > 0 ? 'All other tutors' : `All ${others.length} tutors`}
            </span>
            {!showAll && matched.length > 0 && (
              <button type="button" onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline">
                Show {others.length}
              </button>
            )}
          </div>
        )}

        {secondaryList.map(t => (
          <TutorRow
            key={t.id}
            tutor={t}
            days={availByTutor[t.id] ?? []}
            selected={value === t.id}
            onSelect={() => onChange(t.id)}
          />
        ))}

        {modeCompatible.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            No active tutors available for {bookingMode ?? 'this'} mode.
          </p>
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">
            {tutors.find(t => t.id === value)?.legal_name}
          </span>
        </p>
      )}
    </div>
  )
}

function TutorRow({
  tutor,
  days,
  selected,
  onSelect,
}: {
  tutor: Tutor
  days: number[]
  selected: boolean
  onSelect: () => void
}) {
  const sortedDays = DAY_ORDER.filter(d => days.includes(d))

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-4 ${
        selected
          ? 'bg-secondary border-l-2 border-l-primary'
          : 'hover:bg-muted/30'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{tutor.preferred_name?.trim() || tutor.legal_name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {(tutor.location || tutor.state || tutor.postcode) && (
            <span className="text-xs text-muted-foreground">
              {[tutor.location, [tutor.state, tutor.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
            </span>
          )}
          {tutor.subjects?.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {tutor.subjects.slice(0, 3).join(', ')}{tutor.subjects.length > 3 ? '…' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-wrap gap-1 justify-end">
        {sortedDays.length > 0 ? (
          sortedDays.map(d => (
            <span key={d} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
              {DAY_NAMES[d]}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground italic">No availability set</span>
        )}
      </div>
    </button>
  )
}
