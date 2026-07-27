import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageThread from '@/components/messages/MessageThread'

export default async function AdminThreadPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()

  const [{ data: booking }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, students(name), parents(name), tutors(legal_name)')
      .eq('id', bookingId)
      .single(),
    supabase.from('messages')
      .select('id, sender_id, sender_role, body, read_at, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
  ])

  if (!booking) notFound()

  const parent = booking.parents as any
  const tutor = booking.tutors as any
  const student = booking.students as any

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <a href="/admin/messages" className="text-sm text-muted-foreground hover:text-primary">← Messages</a>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{student?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {parent?.name} ↔ {tutor?.legal_name}
        </p>
      </div>
      <MessageThread
        bookingId={bookingId}
        initialMessages={messages ?? []}
        currentRole="admin"
        myName="Admin"
        otherPartyName=""
        adminParentName={parent?.name}
        adminTutorName={tutor?.legal_name}
        readOnly
      />
    </div>
  )
}
