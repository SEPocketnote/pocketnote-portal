import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAddressChangeTutorAlert, sendAddressChangeResolution } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().max(500).optional(),
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

  const { action, adminNote } = parsed.data
  const admin = createAdminClient()

  const { data: req } = await admin
    .from('address_change_requests')
    .select('id, status, proposed_address, parents(id, name, email, address)')
    .eq('id', id)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (req.status !== 'pending') return NextResponse.json({ error: 'Already resolved' }, { status: 409 })

  const parent = req.parents as any

  if (action === 'approve') {
    // Update parent address
    await admin.from('parents').update({ address: req.proposed_address }).eq('id', parent.id)

    // Notify all active tutors linked to this parent's confirmed bookings
    const { data: bookings } = await admin
      .from('bookings')
      .select('id, students(name), tutors(id, legal_name, email)')
      .eq('parent_id', parent.id)
      .eq('status', 'confirmed')
      .eq('mode', 'in-person')

    const notified = new Set<string>()
    await Promise.allSettled(
      (bookings ?? []).map(async (b: any) => {
        const tutor = b.tutors
        if (!tutor?.email || notified.has(tutor.id)) return
        notified.add(tutor.id)
        await sendAddressChangeTutorAlert({
          tutorName: tutor.legal_name,
          tutorEmail: tutor.email,
          parentName: parent.name,
          studentName: b.students?.name ?? 'Unknown',
          newAddress: req.proposed_address,
          adminNote: adminNote ?? null,
        })
      })
    )
  }

  await admin.from('address_change_requests').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    admin_note: adminNote ?? null,
    resolved_at: new Date().toISOString(),
    resolved_by: user.id,
  }).eq('id', id)

  // Email parent outcome
  sendAddressChangeResolution({
    parentName: parent.name,
    parentEmail: parent.email,
    approved: action === 'approve',
    proposedAddress: req.proposed_address,
    adminNote: adminNote ?? null,
  }).catch(err => console.error('[address-change] resolution email failed:', err))

  return NextResponse.json({ ok: true })
}
