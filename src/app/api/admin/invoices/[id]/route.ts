import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvoiceStatusEmail } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({
  status: z.enum(['submitted', 'approved', 'paid', 'rejected']).optional(),
  admin_notes: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
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

  const admin = createAdminClient()

  const updates: Record<string, string | null> = {}
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.admin_notes !== undefined) updates.admin_notes = parsed.data.admin_notes
  if (parsed.data.paid_at !== undefined) updates.paid_at = parsed.data.paid_at

  const { error } = await admin.from('invoices').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send tutor notification on meaningful status transitions
  const newStatus = parsed.data.status
  if (newStatus === 'approved' || newStatus === 'paid' || newStatus === 'rejected') {
    try {
      const { data: invoice } = await admin
        .from('invoices')
        .select('total_cents, tutor_id')
        .eq('id', id)
        .single()
      const { data: tutor } = invoice
        ? await admin.from('tutors').select('legal_name, email').eq('id', invoice.tutor_id).single()
        : { data: null }

      if (invoice && tutor) {
        const shortId = id.slice(0, 8).toUpperCase()
        await sendInvoiceStatusEmail({
          recipientName: tutor.legal_name,
          recipientEmail: tutor.email,
          status: newStatus,
          invoiceRef: shortId,
          totalCents: invoice.total_cents,
          rejectionReason: newStatus === 'rejected' ? (parsed.data.admin_notes ?? null) : null,
        })
      }
    } catch (err) {
      console.error('[invoices] status email failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
