const STATE_TIMEZONES: Record<string, string> = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  ACT: 'Australia/Sydney',
  TAS: 'Australia/Hobart',
  QLD: 'Australia/Brisbane',
  SA:  'Australia/Adelaide',
  WA:  'Australia/Perth',
  NT:  'Australia/Darwin',
}

export function stateToTimezone(state: string | null | undefined): string {
  return STATE_TIMEZONES[(state ?? '').toUpperCase()] ?? 'Australia/Sydney'
}

function getParts(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: tz, ...opts }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
  return map
}

// "Monday 14 July at 3:00 pm"
export function formatSessionFull(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  return `${p.weekday} ${p.day} ${p.month} at ${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}`
}

// "Monday 14 July"
export function formatSessionDate(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, { weekday: 'long', day: 'numeric', month: 'long' })
  return `${p.weekday} ${p.day} ${p.month}`
}

// "Monday 14 July 2025"
export function formatSessionDateFullYear(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`
}

// "Mon 14 Jul"
export function formatSessionDateShort(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${p.weekday} ${p.day} ${p.month}`
}

// "Mon 14 Jul · 3:00 pm"
export function formatSessionDateShortTime(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  return `${p.weekday} ${p.day} ${p.month} · ${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}`
}

// "3:00 pm"
export function formatTime(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}`
}

function dateStrInTz(date: Date | string, tz: string): string {
  const p = getParts(new Date(date), tz, { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${p.year}-${p.month}-${p.day}`
}

export function isTodayInTz(date: Date | string, tz: string): boolean {
  return dateStrInTz(date, tz) === dateStrInTz(new Date(), tz)
}

export function isTomorrowInTz(date: Date | string, tz: string): boolean {
  const d = dateStrInTz(date, tz)
  const n = dateStrInTz(new Date(), tz)
  const [ny, nm, nd] = n.split('-').map(Number)
  const [sy, sm, sd] = d.split('-').map(Number)
  const nowDate = new Date(ny, nm - 1, nd)
  const sessionDate = new Date(sy, sm - 1, sd)
  return sessionDate.getTime() - nowDate.getTime() === 86_400_000
}

// Converts UTC ISO string to "yyyy-MM-ddTHH:mm" in a given timezone (for datetime-local inputs)
export function toZonedDatetimeInput(utcIso: string, tz: string): string {
  const date = new Date(utcIso)
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  const h = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`
}

// Converts a "yyyy-MM-ddTHH:mm" string interpreted in a given timezone to a UTC Date
export function toUtcFromZoned(localDatetimeStr: string, tz: string): Date {
  const [datePart, timePart = '00:00'] = localDatetimeStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  // Treat the local time as if it were UTC to get a naive reference point
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute))
  // Find what local time corresponds to naiveUtc in the target timezone
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(naiveUtc)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
  const lh = get('hour') === 24 ? 0 : get('hour')
  const localEquiv = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), lh, get('minute')))
  // Offset = naiveUtc - localEquiv; actual UTC = naiveUtc + offset
  return new Date(naiveUtc.getTime() + (naiveUtc.getTime() - localEquiv.getTime()))
}
