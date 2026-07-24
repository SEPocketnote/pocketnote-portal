import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MessageThread from '@/components/messages/MessageThread'

export default async function ParentThreadPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents').select('id, name').eq('user_id', user!.id).single()

  const [{ data: booking }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, tutor_id, students(name)')
      .eq('id', bookingId)
      .eq('parent_id', parent?.id)
      .single(),
    supabase.from('messages')
      .select('id, sender_id, sender_role, body, read_at, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true }),
  ])

  if (!booking) notFound()

  // Tutors RLS only allows own row — use admin client to safely read the name
  const admin = createAdminClient()
  const { data: tutor } = await admin
    .from('tutors')
    .select('legal_name')
    .eq('id', (booking as any).tutor_id)
    .single()

  const student = booking.students as any

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <a href="/parent/messages" className="text-sm text-muted-foreground hover:text-primary">← Messages</a>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{tutor?.legal_name}</h1>
        <p className="text-sm text-muted-foreground">re: {student?.name}</p>
      </div>
      <MessageThread
        bookingId={bookingId}
        initialMessages={messages ?? []}
        currentRole="parent"
        myName={parent?.name ?? 'You'}
        otherPartyName={tutor?.legal_name ?? 'Tutor'}
      />
    </div>
  )
}
