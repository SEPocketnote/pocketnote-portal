'use client'

import { useState, useMemo } from 'react'

const DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun',
}
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Tutor = {
  id: string
  legal_name: string
  location: string | null
  subjects: string[]
  year_levels: string[]
}

type AvailabilityRow = { tutor_id: string; day_of_week: number }

export default function TutorPicker({
  tutors,
  availability,
  value,
  onChange,
}: {
  tutors: Tutor[]
  availability: AvailabilityRow[]
  value: string
  onChange: (id: string) => void
}) {
  const [locationFilter, setLocationFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Group availability days by tutor
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

  const filter = locationFilter.trim().toLowerCase()

  const { matched, others } = useMemo(() => {
    if (!filter) return { matched: [], others: tutors }
    const matched: Tutor[] = []
    const others: Tutor[] = []
    for (const t of tutors) {
      const loc = (t.location ?? '').toLowerCase()
      if (loc.includes(filter)) matched.push(t)
      else others.push(t)
    }
    return { matched, others }
  }, [tutors, filter])

  const visibleOthers = filter && !showAll ? [] : others

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="input"
        placeholder="Filter by suburb or area…"
        value={locationFilter}
        onChange={e => { setLocationFilter(e.target.value); setShowAll(false) }}
      />

      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {/* Location-matched tutors */}
        {matched.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tutors in this area
            </div>
            {matched.map(t => (
              <TutorRow
                key={t.id}
                tutor={t}
                days={availByTutor[t.id] ?? []}
                selected={value === t.id}
                onSelect={() => onChange(t.id)}
              />
            ))}
          </>
        )}

        {/* All other tutors */}
        {filter && others.length > 0 && (
          <div className="px-3 py-1.5 bg-muted/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              All other tutors
            </span>
            {!showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs text-primary hover:underline"
              >
                Show {others.length}
              </button>
            )}
          </div>
        )}

        {visibleOthers.map(t => (
          <TutorRow
            key={t.id}
            tutor={t}
            days={availByTutor[t.id] ?? []}
            selected={value === t.id}
            onSelect={() => onChange(t.id)}
          />
        ))}

        {tutors.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No active tutors found.</p>
        )}
      </div>

      {/* Selected tutor confirmation */}
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
        <p className="text-sm font-medium">{tutor.legal_name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {tutor.location && (
            <span className="text-xs text-muted-foreground">{tutor.location}</span>
          )}
          {tutor.subjects?.length > 0 && (
            <span className="text-xs text-muted-foreground">{tutor.subjects.slice(0, 3).join(', ')}{tutor.subjects.length > 3 ? '…' : ''}</span>
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
