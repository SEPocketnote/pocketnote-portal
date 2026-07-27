import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: invoice } = await admin.from('invoices').select('*').eq('id', id).single()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: tutor } = await admin
    .from('tutors').select('legal_name, email').eq('id', invoice.tutor_id).single()

  const { data: invoiceSessions } = await admin
    .from('invoice_sessions').select('session_id').eq('invoice_id', id)

  const sessionIds = (invoiceSessions ?? []).map((s: { session_id: string }) => s.session_id)
  let sessions: Array<{ id: string; scheduled_at: string; duration_minutes: number | null; student_name: string | null }> = []

  if (sessionIds.length) {
    const { data: rawSessions } = await admin
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, bookings(students(name))')
      .in('id', sessionIds)
      .order('scheduled_at', { ascending: true })

    sessions = (rawSessions ?? []).map((s: any) => ({
      id: s.id,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      student_name: s.bookings?.students?.name ?? null,
    }))
  }

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice, tutor, sessions })
  )

  const shortId = invoice.id.slice(0, 8).toUpperCase()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pocketnote-invoice-${shortId}.pdf"`,
    },
  })
}
