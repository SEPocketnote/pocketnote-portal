import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { upsertBrevoContact } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  stripe_customer_id: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { name, email, phone, stripe_customer_id: existingStripeId } = parsed.data
  const admin = createAdminClient()

  // Prevent duplicates
  const { data: existing } = await admin.from('parents').select('id').eq('email', email.toLowerCase()).maybeSingle()
  if (existing) return NextResponse.json({ error: 'A parent with this email already exists.' }, { status: 409 })

  // Resolve Stripe customer — use provided ID or create a new one
  let stripeCustomerId: string | null = existingStripeId ?? null
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({ name, email, phone })
      stripeCustomerId = customer.id
    } catch (err) {
      console.error('[admin/parents] stripe create failed:', err)
      return NextResponse.json({ error: 'Failed to create payment account.' }, { status: 502 })
    }
  }

  const { data: parent, error } = await admin
    .from('parents')
    .insert({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      stripe_customer_id: stripeCustomerId,
      // user_id intentionally omitted — no portal access until invite is sent
    })
    .select('id')
    .single()

  if (error || !parent) return NextResponse.json({ error: error?.message ?? 'Failed to create parent' }, { status: 500 })

  // Add to Brevo contact list (no email sent)
  try {
    await upsertBrevoContact({
      email: email.toLowerCase(),
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' '),
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ id: parent.id })
}
