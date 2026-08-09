import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

async function resolveParent(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: parent } = await supabase
    .from('parents')
    .select('id, stripe_customer_id, default_payment_method_id')
    .eq('user_id', user.id)
    .single()
  return parent ? { ...parent, userId: user.id } : null
}

// GET — list all saved payment methods
export async function GET() {
  const supabase = await createClient()
  const parent = await resolveParent(supabase)
  if (!parent) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!parent.stripe_customer_id) return NextResponse.json({ paymentMethods: [] })

  const { data: pms } = await stripe.paymentMethods.list({
    customer: parent.stripe_customer_id,
    type: 'card',
  })

  return NextResponse.json({
    paymentMethods: pms.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === parent.default_payment_method_id,
    })),
  })
}

// DELETE — remove a payment method (blocked if it's the last one)
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const parent = await resolveParent(supabase)
  if (!parent) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { paymentMethodId } = await request.json()
  if (!paymentMethodId) return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 })

  // Verify it belongs to this customer
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (pm.customer !== parent.stripe_customer_id) {
    return NextResponse.json({ error: 'Not your payment method' }, { status: 403 })
  }

  // Block removal if it's the only card
  const { data: all } = await stripe.paymentMethods.list({
    customer: parent.stripe_customer_id,
    type: 'card',
  })
  if (all.length <= 1) {
    return NextResponse.json({ error: 'You must have at least one payment method on file. Add a new card before removing this one.' }, { status: 400 })
  }

  await stripe.paymentMethods.detach(paymentMethodId)

  // If this was the default, promote the next card
  const admin = createAdminClient()
  if (paymentMethodId === parent.default_payment_method_id) {
    const next = all.find(p => p.id !== paymentMethodId)
    if (next) {
      await stripe.customers.update(parent.stripe_customer_id, {
        invoice_settings: { default_payment_method: next.id },
      })
      await admin.from('parents').update({ default_payment_method_id: next.id }).eq('id', parent.id)
    }
  }

  return NextResponse.json({ ok: true })
}

// PATCH — set a card as default
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const parent = await resolveParent(supabase)
  if (!parent) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { paymentMethodId } = await request.json()
  if (!paymentMethodId) return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 })

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (pm.customer !== parent.stripe_customer_id) {
    return NextResponse.json({ error: 'Not your payment method' }, { status: 403 })
  }

  await stripe.customers.update(parent.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })

  const admin = createAdminClient()
  await admin.from('parents').update({ default_payment_method_id: paymentMethodId }).eq('id', parent.id)

  return NextResponse.json({ ok: true })
}
