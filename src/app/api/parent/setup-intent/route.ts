import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: parent } = await supabase
    .from('parents')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!parent?.stripe_customer_id) {
    return NextResponse.json({ error: 'No payment account found' }, { status: 400 })
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: parent.stripe_customer_id,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
