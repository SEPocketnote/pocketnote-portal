import { stripe } from './stripe'

type CreateSubscriptionParams = {
  stripeCustomerId: string
  paymentMethodId: string
  rateCents: number
  durationMinutes: number
  scheduleType: 'weekly' | 'fortnightly'
  firstSessionDate: Date
}

/**
 * Creates a Stripe subscription for a recurring booking.
 * Charges the per-session fee on the billing cycle anchored to the first session date.
 */
export async function createBookingSubscription({
  stripeCustomerId,
  paymentMethodId,
  rateCents,
  durationMinutes,
  scheduleType,
  firstSessionDate,
}: CreateSubscriptionParams): Promise<string> {
  // Per-session amount
  const amountCents = Math.round((rateCents * durationMinutes) / 60)

  // Billing interval
  const intervalCount = scheduleType === 'fortnightly' ? 2 : 1

  // Anchor the billing cycle to the first session (must be in the future)
  const nowSec = Math.floor(Date.now() / 1000)
  const anchorSec = Math.max(Math.floor(firstSessionDate.getTime() / 1000), nowSec + 60)

  // Create a product to attach the price to (one per subscription)
  const product = await stripe.products.create({
    name: scheduleType === 'fortnightly' ? 'Fortnightly tutoring session' : 'Weekly tutoring session',
  })

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    default_payment_method: paymentMethodId,
    billing_cycle_anchor: anchorSec,
    proration_behavior: 'none',
    items: [
      {
        price_data: {
          currency: 'aud',
          unit_amount: amountCents,
          product: product.id,
          recurring: {
            interval: 'week',
            interval_count: intervalCount,
          },
        },
      },
    ],
  })

  return subscription.id
}
