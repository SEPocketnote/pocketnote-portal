'use client'

import { useMemo } from 'react'
import { formatTime } from '@/lib/timezone'

type SessionEntry = {
  scheduled_at: string
  studentName: string
  durationMinutes: number
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getLocalParts(isoString: string, tz: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(isoString))
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')), // 1-indexed
    day: parseInt(get('day')),
  }
}

export default function MiniCalendar({ sessions, tz }: { sessions: SessionEntry[]; tz: string }) {
  const today = useMemo(() => getLocalParts(new Date().toISOString(), tz), [tz])

  // Set of "year-month-day" strings that have a session
  const sessionDayKeys = useMemo(() => {
    const set = new Set<string>()
    for (const s of sessions) {
      const { year, month, day } = getLocalParts(s.scheduled_at, tz)
      set.add(`${year}-${month}-${day}`)
    }
    return set
  }, [sessions, tz])

  // Build calendar grid (Mon-first)
  const { year, month } = today
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Mon=0 … Sun=6
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const nextSessions = sessions.slice(0, 5)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      {/* Month header */}
      <h3 className="font-semibold text-sm text-foreground">
        {MONTH_NAMES[month - 1]} {year}
      </h3>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-medium text-muted-foreground pb-1">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = day === today.day
          const hasSession = sessionDayKeys.has(`${year}-${month}-${day}`)
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isToday
                  ? 'bg-primary text-white'
                  : 'text-foreground hover:bg-muted'
              }`}>
                {day}
              </div>
              {hasSession && (
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? 'bg-white/80' : 'bg-primary/60'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Upcoming sessions */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Upcoming
        </p>
        {nextSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No upcoming sessions</p>
        ) : (
          <div className="space-y-3">
            {nextSessions.map((s, i) => {
              const { month: sm, day: sd } = getLocalParts(s.scheduled_at, tz)
              const isToday = sd === today.day && sm === today.month
              const dateLabel = isToday
                ? 'Today'
                : `${MONTH_NAMES[sm - 1].slice(0, 3)} ${sd}`
              return (
                <div key={i} className="flex items-stretch gap-3">
                  <div className={`w-1 rounded-full shrink-0 ${isToday ? 'bg-primary' : 'bg-primary/30'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateLabel} · {formatTime(s.scheduled_at, tz)} · {s.durationMinutes} min
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
