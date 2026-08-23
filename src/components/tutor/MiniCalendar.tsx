'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatTime } from '@/lib/timezone'

export type CalendarSession = {
  scheduled_at: string
  studentName: string
  durationMinutes: number
  mode: string
  location?: string | null
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
    month: parseInt(get('month')),
    day: parseInt(get('day')),
  }
}

export default function MiniCalendar({ sessions, tz }: { sessions: CalendarSession[]; tz: string }) {
  const todayLocal = useMemo(() => getLocalParts(new Date().toISOString(), tz), [tz])
  const [viewYear, setViewYear] = useState(todayLocal.year)
  const [viewMonth, setViewMonth] = useState(todayLocal.month)
  const [selectedDay, setSelectedDay] = useState<number | null>(() =>
    getLocalParts(new Date().toISOString(), tz).day
  )

  function prevMonth() {
    setSelectedDay(null)
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDay(null)
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const firstDow = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const sessionMap = useMemo(() => {
    const map = new Map<string, CalendarSession[]>()
    for (const s of sessions) {
      const { year, month, day } = getLocalParts(s.scheduled_at, tz)
      const key = `${year}-${month}-${day}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [sessions, tz])

  const selectedSessions = selectedDay
    ? (sessionMap.get(`${viewYear}-${viewMonth}-${selectedDay}`) ?? [])
    : []

  const isToday = (day: number) =>
    day === todayLocal.day && viewMonth === todayLocal.month && viewYear === todayLocal.year

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">

      {/* Coral gradient header */}
      <div className="bg-gradient-to-r from-primary to-primary/75 px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-white text-sm tracking-wide">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="p-4 space-y-3">

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-muted-foreground pb-1 uppercase tracking-wider">{d}</div>
          ))}

          {/* Day cells */}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const today = isToday(day)
            const key = `${viewYear}-${viewMonth}-${day}`
            const hasSessions = sessionMap.has(key)
            const isSelected = selectedDay === day

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="flex flex-col items-center py-0.5 group"
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  today
                    ? 'bg-primary text-white shadow-sm'
                    : isSelected
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-foreground group-hover:bg-muted'
                }`}>
                  {day}
                </div>
                {hasSessions && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    today ? 'bg-white' : 'bg-primary'
                  }`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day / default panel */}
        <div className="pt-2 border-t border-border">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground">
                  {MONTH_NAMES[viewMonth - 1]} {selectedDay}
                </p>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {selectedSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No sessions on this day</p>
              ) : (
                <div className="space-y-2.5">
                  {selectedSessions.map((s, i) => (
                    <div key={i} className="flex items-stretch gap-2.5 bg-primary/5 rounded-xl px-3 py-2.5">
                      <div className="w-1 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(s.scheduled_at, tz)} · {s.durationMinutes} min ·{' '}
                          {s.mode === 'online' ? 'Online' : s.location ?? 'In-person'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Select a day to see sessions
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
