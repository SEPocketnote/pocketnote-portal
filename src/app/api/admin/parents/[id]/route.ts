import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
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
  if ('phone' in updates && updates.phone === '') updates.phone = null

  const admin = createAdminClient()
  const { error } = await admin.from('parents').update(updates).eq('id', id)
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
    .eq('parent_id', id)
    .eq('status', 'confirmed')
  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete a parent with active bookings. Cancel their bookings first.' }, { status: 400 })
  }

  const { data: parent } = await admin.from('parents').select('user_id').eq('id', id).single()

  // Delete sessions for all this parent's bookings, then bookings, then students, then parent
  const { data: bookingIds } = await admin.from('bookings').select('id').eq('parent_id', id)
  if (bookingIds?.length) {
    const ids = bookingIds.map(b => b.id)
    await admin.from('sessions').delete().in('booking_id', ids)
    await admin.from('bookings').delete().in('id', ids)
  }
  await admin.from('students').delete().eq('parent_id', id)

  const { error: deleteError } = await admin.from('parents').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (parent?.user_id) {
    await admin.auth.admin.deleteUser(parent.user_id)
  }

  return NextResponse.json({ ok: true })
}
