'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { stateToTimezone, formatSessionDateFullYear, formatTime } from '@/lib/timezone'
import { tutorDisplayName } from '@/lib/tutor-display'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
}

type Report = {
  covered: string | null
  went_well: string | null
  needs_work: string | null
  next_session_plan: string | null
  notes: string | null
} | null

type Session = {
  id: string
  scheduled_at: string
  status: string
  duration_minutes: number
  progress_reports: Report
  bookings: {
    id: string
    mode: string
    parents: { id: string; name: string } | null
    students: { name: string } | null
    tutors: { id: string; legal_name: string; preferred_name?: string | null; state?: string | null } | null
  } | null
}

function ReportPanel({ report }: { report: Report }) {
  if (!report) return null
  const fields = [
    ['Covered', report.covered],
    ['Went well', report.went_well],
    ['Needs work', report.needs_work],
    ['Next session plan', report.next_session_plan],
    ['Notes', report.notes],
  ].filter(([, v]) => v)

  if (!fields.length) return <p className="text-xs text-muted-foreground italic">No content submitted.</p>

  return (
    <div className="space-y-2">
      {fields.map(([label, value]) => (
        <div key={label as string}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      ))}
    </div>
  )
}

function DesktopRow({ s }: { s: Session }) {
  const [open, setOpen] = useState(false)
  const tz = stateToTimezone(s.bookings?.tutors?.state)
  const hasReport = !!s.progress_reports

  return (
    <>
      <tr className="hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium">{formatSessionDateFullYear(s.scheduled_at, tz)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(s.scheduled_at, tz)}</p>
        </td>
        <td className="px-4 py-3">{s.bookings?.students?.name ?? '—'}</td>
        <td className="px-4 py-3">
          {s.bookings?.parents ? (
            <Link href={`/admin/parents/${s.bookings.parents.id}`} className="hover:text-primary hover:underline">
              {s.bookings.parents.name}
            </Link>
          ) : '—'}
        </td>
        <td className="px-4 py-3">
          {s.bookings?.tutors ? (
            <Link href={`/admin/tutors/${s.bookings.tutors.id}`} className="hover:text-primary hover:underline">
              {tutorDisplayName(s.bookings.tutors) || '—'}
            </Link>
          ) : '—'}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{s.duration_minutes} min</td>
        <td className="px-4 py-3">
          {hasReport && (
            <button
              onClick={() => setOpen(o => !o)}
              title="View progress report"
              className={`transition-colors ${open ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] ?? 'bg-muted text-muted-foreground'}`}>
            {s.status}
          </span>
        </td>
      </tr>
      {hasReport && open && (
        <tr>
          <td colSpan={7} className="px-6 py-4 bg-muted/20 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Progress report</p>
            <ReportPanel report={s.progress_reports} />
          </td>
        </tr>
      )}
    </>
  )
}

function MobileCard({ s }: { s: Session }) {
  const [open, setOpen] = useState(false)
  const tz = stateToTimezone(s.bookings?.tutors?.state)
  const hasReport = !!s.progress_reports

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <Link href={`/admin/bookings/${s.bookings?.id}`} className="min-w-0 flex-1">
          <p className="font-medium text-sm">{s.bookings?.students?.name}</p>
          <p className="text-xs text-muted-foreground">{s.bookings?.parents?.name} · {tutorDisplayName(s.bookings?.tutors)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatSessionDateFullYear(s.scheduled_at, tz)} · {formatTime(s.scheduled_at, tz)} · {s.duration_minutes} min
          </p>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {hasReport && (
            <button
              onClick={() => setOpen(o => !o)}
              title="View progress report"
              className={`transition-colors ${open ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] ?? 'bg-muted text-muted-foreground'}`}>
            {s.status}
          </span>
        </div>
      </div>
      {hasReport && open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Progress report</p>
          <ReportPanel report={s.progress_reports} />
        </div>
      )}
    </div>
  )
}

export default function SessionsTable({ sessions }: { sessions: Session[] }) {
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {sessions.map(s => <MobileCard key={s.id} s={s} />)}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#F5F4F2]">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date & time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</th>
              <th className="px-4 py-3 w-8" />
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map(s => <DesktopRow key={s.id} s={s} />)}
          </tbody>
        </table>
      </div>
    </>
  )
}
