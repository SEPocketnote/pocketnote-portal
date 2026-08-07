import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAddressChangeAdminAlert } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({
  proposedAddress: z.string().min(1).max(500),
  parentNote: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, address')
    .eq('user_id', user.id)
    .single()

  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

  // Block duplicate pending requests
  const admin = createAdminClient()
  const { count: existing } = await admin
    .from('address_change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', parent.id)
    .eq('status', 'pending')

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: 'You already have a pending address update request' }, { status: 409 })
  }

  const { error } = await admin.from('address_change_requests').insert({
    parent_id: parent.id,
    current_address: parent.address ?? null,
    proposed_address: parsed.data.proposedAddress,
    parent_note: parsed.data.parentNote ?? null,
  })

  if (error) return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })

  sendAddressChangeAdminAlert({
    parentName: parent.name,
    currentAddress: parent.address ?? null,
    proposedAddress: parsed.data.proposedAddress,
    parentNote: parsed.data.parentNote ?? null,
  }).catch(err => console.error('[address-change] admin alert failed:', err))

  return NextResponse.json({ ok: true })
}
