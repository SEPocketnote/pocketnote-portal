import { addDays, format, getDay, parseISO } from 'date-fns'
import { toZonedDatetimeInput, toUtcFromZoned } from './timezone'

/**
 * Calculate the UTC datetime when payment is due for a session.
 * Returns the next occurrence of paymentDayOfWeek at paymentTime (in the given
 * timezone) that is strictly after the session's scheduled_at.
 *
 * @param scheduledAt    - Session UTC ISO string
 * @param paymentDayOfWeek - 0=Sun … 6=Sat (JS getDay() convention)
 * @param paymentTime    - "HH:MM" in the given timezone
 * @param timezone       - IANA timezone string
 */
export function calcPaymentDueAt(
  scheduledAt: string,
  paymentDayOfWeek: number,
  paymentTime: string,
  timezone: string,
): Date {
  const localDateStr = toZonedDatetimeInput(scheduledAt, timezone).slice(0, 10) // "YYYY-MM-DD"
  const sessionDow = getDay(parseISO(localDateStr + 'T12:00:00')) // noon avoids DST edge cases

  let daysAhead = paymentDayOfWeek - sessionDow
  if (daysAhead < 0) daysAhead += 7

  const candidateLocalDate = addDays(parseISO(localDateStr), daysAhead)
  const candidateLocalStr = `${format(candidateLocalDate, 'yyyy-MM-dd')}T${paymentTime}`
  const candidateUtc = toUtcFromZoned(candidateLocalStr, timezone)

  // If candidate is not strictly after the session, push one week ahead
  if (candidateUtc.getTime() <= new Date(scheduledAt).getTime()) {
    const nextDate = addDays(candidateLocalDate, 7)
    return toUtcFromZoned(`${format(nextDate, 'yyyy-MM-dd')}T${paymentTime}`, timezone)
  }

  return candidateUtc
}

/**
 * Calculate the charge in cents for a session.
 *
 * @param parentRateCents - Hourly rate in cents
 * @param durationMinutes - Session duration in minutes
 * @param discountType - 'percent' | 'fixed' | null
 * @param discountValue - For 'percent': 0–100. For 'fixed': dollars (not cents).
 */
export function calcChargeCents(
  parentRateCents: number,
  durationMinutes: number,
  discountType?: string | null,
  discountValue?: number | null,
): number {
  let cents = Math.round((parentRateCents * durationMinutes) / 60)

  if (discountType === 'percent' && discountValue != null && discountValue > 0) {
    cents = Math.round(cents * (1 - discountValue / 100))
  } else if (discountType === 'fixed' && discountValue != null && discountValue > 0) {
    cents = cents - Math.round(discountValue * 100)
  }

  return Math.max(0, cents)
}
