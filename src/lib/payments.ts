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
