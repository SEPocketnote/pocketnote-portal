import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { createBookingSubscription } from '@/lib/stripe-subscriptions'
import { z } from 'zod'

const Schema = z.object({
  paymentMethodId: z.string().min(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { paymentMethodId } = parsed.data
  const admin = createAdminClient()

  const { data: parent } = await supabase
    .from('parents')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!parent?.stripe_customer_id) {
    return NextResponse.json({ error: 'No payment account found' }, { status: 400 })
  }

  // Verify the payment method belongs to this customer
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (pm.customer !== parent.stripe_customer_id) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 403 })
  }

  // Set as default on the Stripe customer
  await stripe.customers.update(parent.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })

  // Record on parent + mark ToS accepted — both in parallel
  await Promise.all([
    admin.from('parents').update({ default_payment_method_id: paymentMethodId }).eq('id', parent.id),
    supabase.from('profiles').update({ tos_accepted_at: new Date().toISOString() }).eq('id', user.id),
  ])

  // Create subscriptions for any recurring bookings that don't have one yet
  const { data: pendingBookings } = await admin
    .from('bookings')
    .select('id, rate_cents_snapshot, duration_minutes, schedule_type, start_date, sessions(scheduled_at)')
    .eq('parent_id', parent.id)
    .eq('status', 'confirmed')
    .in('schedule_type', ['weekly', 'fortnightly'])
    .is('stripe_subscription_id', null)

  if (pendingBookings && pendingBookings.length > 0) {
    await Promise.allSettled(
      pendingBookings.map(async (booking) => {
        if (!booking.rate_cents_snapshot) return
        // Use the earliest scheduled session date as the billing anchor
        const sessions = (booking.sessions as { scheduled_at: string }[] | null) ?? []
        const firstDate = sessions.length > 0
          ? new Date(sessions.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0].scheduled_at)
          : new Date(booking.start_date)

        const subId = await createBookingSubscription({
          stripeCustomerId: parent.stripe_customer_id!,
          paymentMethodId,
          rateCents: booking.rate_cents_snapshot,
          durationMinutes: booking.duration_minutes ?? 60,
          scheduleType: booking.schedule_type as 'weekly' | 'fortnightly',
          firstSessionDate: firstDate,
        })
        await admin.from('bookings').update({ stripe_subscription_id: subId }).eq('id', booking.id)
      })
    )
  }

  return NextResponse.json({ ok: true })
}
