import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  const body = await request.text()

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const isPaid = event.type === 'invoice.paid'

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

    // Resolve booking:
    // 1. Subscription invoice → match via stripe_subscription_id on booking
    // 2. One-off invoice → match via stripe_customer_id on parent → most recent confirmed booking
    let bookingId: string | null = null

    if (subscriptionId) {
      const { data: booking } = await admin
        .from('bookings')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()
      if (booking) {
        bookingId = booking.id
      } else {
        // Race condition: subscription_id not yet written to DB (fires before complete-setup commits).
        // Fall back to customer → most recent unlinked recurring booking and heal the missing ID.
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
        if (customerId) {
          const { data: parent } = await admin
            .from('parents')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          if (parent) {
            const { data: fallback } = await admin
              .from('bookings')
              .select('id')
              .eq('parent_id', parent.id)
              .eq('status', 'confirmed')
              .in('schedule_type', ['weekly', 'fortnightly'])
              .is('stripe_subscription_id', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            if (fallback) {
              bookingId = fallback.id
              // Heal the race: store the subscription ID so future webhooks resolve correctly
              await admin.from('bookings').update({ stripe_subscription_id: subscriptionId }).eq('id', fallback.id)
            }
          }
        }
        if (!bookingId) console.warn('[stripe-webhook] no booking found for subscription', subscriptionId)
      }
    } else {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null
      if (customerId) {
        const { data: parent } = await admin
          .from('parents')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        if (parent) {
          const { data: booking } = await admin
            .from('bookings')
            .select('id')
            .eq('parent_id', parent.id)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (booking) bookingId = booking.id
          else console.warn('[stripe-webhook] no confirmed booking for parent', parent.id)
        } else {
          console.warn('[stripe-webhook] no parent found for customer', customerId)
        }
      }
    }

    if (!bookingId) return NextResponse.json({ ok: true })

    const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id ?? null
    const paidAt = invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString()

    await admin.from('payments').upsert(
      {
        booking_id: bookingId,
        amount: isPaid ? invoice.amount_paid : invoice.amount_due,
        status: isPaid ? 'paid' : 'failed',
        paid_at: isPaid ? paidAt : null,
        stripe_charge_id: isPaid ? chargeId : null,
        stripe_invoice_id: invoice.id,
        method: subscriptionId ? 'stripe_subscription' : 'stripe_invoice',
      },
      { onConflict: 'stripe_invoice_id', ignoreDuplicates: false }
    )
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await admin
      .from('bookings')
      .update({ stripe_subscription_id: null })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ ok: true })
}
