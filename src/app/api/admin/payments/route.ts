import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const body = await req.json()
  const { booking_id, amount_dollars, paid_at, method, notes } = body

  if (!booking_id || !amount_dollars || !paid_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const amountCents = Math.round(parseFloat(amount_dollars) * 100)
  if (isNaN(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('payments').insert({
    booking_id,
    amount: amountCents,
    paid_at: new Date(paid_at).toISOString(),
    status: 'paid',
    method: method || 'other',
    notes: notes || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
