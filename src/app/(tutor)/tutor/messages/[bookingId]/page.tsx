import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageThread from '@/components/messages/MessageThread'

export default async function TutorThreadPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors').select('id, legal_name').eq('user_id', user!.id).single()

  if (!tutor) notFound()

  const [{ data: booking }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, students(name), parents(name)')
      .eq('id', bookingId)
      .eq('tutor_id', tutor.id)
      .single(),
    supabase.from('messages')
      .select('id, sender_id, sender_role, body, read_at, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
  ])

  if (!booking) notFound()

  const parent = booking.parents as any
  const student = booking.students as any

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <a href="/tutor/messages" className="text-sm text-muted-foreground hover:text-primary">← Messages</a>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{parent?.name}</h1>
        <p className="text-sm text-muted-foreground">re: {student?.name}</p>
      </div>
      <MessageThread
        bookingId={bookingId}
        initialMessages={messages ?? []}
        currentRole="tutor"
        myName={tutor.legal_name}
        otherPartyName={parent?.name ?? 'Parent'}
      />
    </div>
  )
}
