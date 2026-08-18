import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import React, { createElement } from 'react'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, legal_name, email, phone, abn, gst_registered, state')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Verify invoice belongs to this tutor
  const { data: invoice } = await admin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('tutor_id', tutor.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow download of approved/paid invoices
  if (invoice.status !== 'approved' && invoice.status !== 'paid') {
    return NextResponse.json({ error: 'Invoice not yet approved' }, { status: 403 })
  }

  const { data: invoiceSessions } = await admin
    .from('invoice_sessions')
    .select('session_id, rate_cents')
    .eq('invoice_id', id)

  const sessionIds = (invoiceSessions ?? []).map((s: { session_id: string }) => s.session_id)
  const rateBySessionId = new Map(
    (invoiceSessions ?? []).map((s: { session_id: string; rate_cents: number | null }) => [s.session_id, s.rate_cents])
  )

  let sessions: Array<{
    id: string
    scheduled_at: string
    duration_minutes: number | null
    student_name: string | null
    rate_cents: number | null
    mode: string | null
  }> = []

  if (sessionIds.length) {
    const { data: rawSessions } = await admin
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, bookings(mode, students(name))')
      .in('id', sessionIds)
      .order('scheduled_at', { ascending: true })

    sessions = (rawSessions ?? []).map((s: any) => ({
      id: s.id,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      student_name: s.bookings?.students?.name ?? null,
      rate_cents: rateBySessionId.get(s.id) ?? null,
      mode: s.bookings?.mode ?? null,
    }))
  }

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice, tutor, sessions }) as React.ReactElement<any>
  )

  const shortId = invoice.id.slice(0, 8).toUpperCase()

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pocketnote-invoice-${shortId}.pdf"`,
    },
  })
}
