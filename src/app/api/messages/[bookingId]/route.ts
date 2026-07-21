import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessageNotification } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({ body: z.string().min(1).max(2000) })

export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_id, sender_role, body, read_at, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages })
}

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['parent', 'tutor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only parents and tutors can send messages' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()

  // Get booking with both parties' details
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      id,
      parents ( id, name, email, user_id ),
      tutors ( id, legal_name, email, user_id ),
      students ( name )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const parent = booking.parents as any
  const tutor = booking.tutors as any
  const senderRole = profile.role as 'parent' | 'tutor'

  // Insert the message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({
      booking_id: bookingId,
      sender_id: user.id,
      sender_role: senderRole,
      body: parsed.data.body,
    })
    .select('id, sender_id, sender_role, body, read_at, created_at')
    .single()

  if (insertError || !message) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to send' }, { status: 500 })
  }

  // Email notification: only if recipient has no prior unread messages (avoid spamming)
  const recipientRole = senderRole === 'parent' ? 'tutor' : 'parent'
  const { count: existingUnread } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('booking_id', bookingId)
    .eq('sender_role', senderRole)
    .is('read_at', null)
    .neq('id', message.id) // exclude the message we just inserted

  if ((existingUnread ?? 0) === 0) {
    const recipientName = recipientRole === 'tutor' ? tutor.legal_name : parent.name
    const recipientEmail = recipientRole === 'tutor' ? tutor.email : parent.email
    const senderName = senderRole === 'tutor' ? tutor.legal_name : parent.name
    const portalPath = recipientRole === 'tutor'
      ? `/tutor/messages/${bookingId}`
      : `/parent/messages/${bookingId}`

    sendMessageNotification({
      recipientName,
      recipientEmail,
      senderName,
      messagePreview: parsed.data.body,
      portalPath,
    }).catch(err => console.error('[messages] notification email failed:', err))
  }

  return NextResponse.json({ message })
}
