import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, email, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

  let stripeCustomerId = parent.stripe_customer_id

  // Create a Stripe customer on the fly for parents who don't have one yet
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: parent.name ?? undefined,
      email: parent.email ?? undefined,
    })
    stripeCustomerId = customer.id
    const admin = createAdminClient()
    await admin.from('parents').update({ stripe_customer_id: stripeCustomerId }).eq('id', parent.id)
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
