'use client'

import { useState } from 'react'
import { formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import MarkCompleteButton from './MarkCompleteButton'

type Session = {
  id: string
  scheduled_at: string
  status: string
  duration_minutes: number | null
  booking_id: string
}

export default function StudentCard({
  booking,
  upcoming,
  pastNeedingReport,
  pastWithReport,
  reportedSessionIds,
  tz,
}: {
  booking: any
  upcoming: Session[]
  pastNeedingReport: Session[]
  pastWithReport: Session[]
  reportedSessionIds: Set<string>
  tz: string
}) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const student = booking.students
  const parent = booking.parents
  const nextSession = upcoming[0]
  const moreUpcoming = upcoming.slice(1)
  const visibleMore = showAllUpcoming ? moreUpcoming : moreUpcoming.slice(0, 2)

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-base">{student?.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {student?.year_level}{student?.subjects?.length ? ` · ${student.subjects.join(', ')}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">
              {[pastNeedingReport.length + pastWithReport.length, booking.sessions_count].filter(Boolean).join(' / ')} sessions
            </p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{booking.mode}{booking.location ? ` · ${booking.location}` : ''}</p>
          </div>
        </div>

        {student?.notes && (
          <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mt-3">{student.notes}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
          <span>Parent: <span className="text-foreground">{parent?.name}</span></span>
          {parent?.phone && <a href={`tel:${parent.phone}`} className="text-primary">{parent.phone}</a>}
        </div>
      </div>

      {/* Next session */}
      {nextSession && (
        <div className="px-5 py-3 bg-primary/5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-0.5">Next session</p>
            <p className="text-sm font-medium">
              {formatSessionDateFullYear(nextSession.scheduled_at, tz)} · {formatTime(nextSession.scheduled_at, tz)} · {nextSession.duration_minutes ?? 60} min
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">Upcoming</span>
        </div>
      )}

      {/* More upcoming */}
      {moreUpcoming.length > 0 && (
        <div className="px-5 py-3 border-b border-border">
          <button
            onClick={() => setShowAllUpcoming(v => !v)}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            Upcoming ({moreUpcoming.length})
            <span className="text-base leading-none">{showAllUpcoming ? '▾' : '▸'}</span>
          </button>
          <div className="space-y-2">
            {visibleMore.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes ?? 60} min
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">Upcoming</span>
              </div>
            ))}
            {!showAllUpcoming && moreUpcoming.length > 2 && (
              <button onClick={() => setShowAllUpcoming(true)} className="text-xs text-primary hover:underline">
                + {moreUpcoming.length - 2} more upcoming
              </button>
            )}
          </div>
        </div>
      )}

      {/* Past sessions needing report */}
      {pastNeedingReport.length > 0 && (
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Needs report ({pastNeedingReport.length})</p>
          <div className="space-y-2">
            {pastNeedingReport.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes ?? 60} min
                </span>
                {s.status === 'scheduled' ? (
                  <MarkCompleteButton sessionId={s.id} />
                ) : (
                  <a href={`/tutor/reports/${s.id}`}
                    className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 shrink-0">
                    Write report
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past sessions with reports */}
      {pastWithReport.length > 0 && (
        <div className="px-5 py-3">
          <button
            onClick={() => setShowPast(v => !v)}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            Past sessions ({pastWithReport.length})
            <span className="text-base leading-none">{showPast ? '▾' : '▸'}</span>
          </button>
          {showPast && (
            <div className="space-y-2">
              {pastWithReport.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes ?? 60} min
                  </span>
                  <a href={`/tutor/reports/${s.id}`}
                    className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 shrink-0">
                    ✓ Report
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!nextSession && pastNeedingReport.length === 0 && pastWithReport.length === 0 && (
        <div className="px-5 py-4 text-sm text-muted-foreground">No sessions yet.</div>
      )}
    </div>
  )
}
