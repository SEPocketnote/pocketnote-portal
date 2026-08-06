import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  legal_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  abn: z.string().optional(),
  wwcc_number: z.string().optional(),
  wwcc_expiry: z.string().optional(),
  date_of_birth: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  year_levels: z.array(z.string()).optional(),
  credentials: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  rate_tier_id: z.string().uuid().nullable().optional(),
  hourly_rate_override_cents: z.number().int().min(1).nullable().optional(),
  mode: z.enum(['online', 'in-person', 'either']).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updates: Record<string, any> = { ...parsed.data }

  // If verifying, stamp the timestamp
  if (updates.verified === true) updates.verified_at = new Date().toISOString()
  if (updates.verified === false) updates.verified_at = null

  // Blank strings → null for optional fields
  for (const key of ['phone', 'location', 'state', 'postcode', 'address', 'bio', 'abn', 'wwcc_number', 'wwcc_expiry', 'date_of_birth']) {
    if (key in updates && updates[key] === '') updates[key] = null
  }

  const admin = createAdminClient()
  const { error } = await admin.from('tutors').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { count } = await admin.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', id)
    .eq('status', 'confirmed')
  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete a tutor with active bookings. Cancel their bookings first.' }, { status: 400 })
  }

  const { data: tutor } = await admin.from('tutors').select('user_id').eq('id', id).single()
  await admin.from('tutors').delete().eq('id', id)
  if (tutor?.user_id) {
    await admin.auth.admin.deleteUser(tutor.user_id)
  }

  return NextResponse.json({ ok: true })
}
