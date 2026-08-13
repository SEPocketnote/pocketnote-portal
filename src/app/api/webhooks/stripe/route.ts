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

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

    if (!subscriptionId) return NextResponse.json({ ok: true })

    // Find the booking this subscription belongs to
    const { data: booking } = await admin
      .from('bookings')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (!booking) {
      console.warn('[stripe-webhook] no booking found for subscription', subscriptionId)
      return NextResponse.json({ ok: true })
    }

    const amountCents = invoice.amount_paid
    const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id ?? null
    const paidAt = invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString()

    // Upsert payment record keyed on stripe_invoice_id so replayed webhooks are idempotent
    await admin.from('payments').upsert(
      {
        booking_id: booking.id,
        amount: amountCents,
        status: 'paid',
        paid_at: paidAt,
        stripe_charge_id: chargeId,
        stripe_invoice_id: invoice.id,
      },
      { onConflict: 'stripe_invoice_id', ignoreDuplicates: false }
    )
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

    if (!subscriptionId) return NextResponse.json({ ok: true })

    const { data: booking } = await admin
      .from('bookings')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (!booking) return NextResponse.json({ ok: true })

    await admin.from('payments').upsert(
      {
        booking_id: booking.id,
        amount: invoice.amount_due,
        status: 'failed',
        stripe_invoice_id: invoice.id,
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
