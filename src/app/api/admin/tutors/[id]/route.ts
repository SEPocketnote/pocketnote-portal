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
  online_rate_override_cents: z.number().int().min(1).nullable().optional(),
  inperson_rate_override_cents: z.number().int().min(1).nullable().optional(),
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

  // Delete sessions for all this tutor's bookings, then bookings, then tutor
  const { data: bookingIds } = await admin.from('bookings').select('id').eq('tutor_id', id)
  if (bookingIds?.length) {
    const ids = bookingIds.map(b => b.id)
    await admin.from('sessions').delete().in('booking_id', ids)
    await admin.from('bookings').delete().in('id', ids)
  }

  const { error: deleteError } = await admin.from('tutors').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (tutor?.user_id) {
    await admin.auth.admin.deleteUser(tutor.user_id)
  }

  return NextResponse.json({ ok: true })
}
