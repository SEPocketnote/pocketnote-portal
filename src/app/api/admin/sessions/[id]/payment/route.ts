import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  method: z.enum(['stripe_charge', 'ndis', 'bank_transfer', 'cash', 'other']),
  amountCents: z.number().int().positive(),
  paidAt: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: sessionId } = await params
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { method, amountCents, paidAt, reference, notes } = parsed.data
  const admin = createAdminClient()

  const { data: session } = await admin
    .from('sessions')
    .select('booking_id')
    .eq('id', sessionId)
    .single()

  if (!session?.booking_id) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  await admin.from('payments').insert({
    booking_id: session.booking_id,
    amount: amountCents,
    status: 'paid',
    paid_at: new Date(paidAt).toISOString(),
    method,
    stripe_charge_id: method === 'stripe_charge' ? (reference ?? null) : null,
    // For non-Stripe methods the reference (claim number, bank ref, etc.) goes in notes
    notes: method !== 'stripe_charge' ? (reference ?? notes ?? null) : (notes ?? null),
  })

  return NextResponse.json({ ok: true })
}
