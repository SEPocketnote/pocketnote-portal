import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function ParentMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents').select('id').eq('user_id', user!.id).single()

  const [{ data: bookings }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, tutor_id, students(name)')
      .eq('parent_id', parent!.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
    supabase.from('messages')
      .select('id, booking_id, sender_role, body, read_at, created_at')
      .order('created_at', { ascending: false }),
  ])

  // Tutors RLS restricts reads to own row — fetch names via admin client
  const tutorIds = [...new Set((bookings ?? []).map((b: any) => b.tutor_id).filter(Boolean))]
  const admin = createAdminClient()
  const { data: tutors } = tutorIds.length
    ? await admin.from('tutors').select('id, legal_name').in('id', tutorIds)
    : { data: [] }
  const tutorNames: Record<string, string> = {}
  for (const t of tutors ?? []) tutorNames[t.id] = t.legal_name

  // Group messages by booking
  const msgsByBooking: Record<string, typeof messages> = {}
  for (const m of messages ?? []) {
    if (!msgsByBooking[m.booking_id]) msgsByBooking[m.booking_id] = []
    msgsByBooking[m.booking_id]!.push(m)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>

      {!bookings?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          No active bookings yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border divide-y divide-border">
          {bookings.map((b: any) => {
            const msgs = msgsByBooking[b.id] ?? []
            const last = msgs[0]
            const unread = msgs.filter(m => m.sender_role === 'tutor' && !m.read_at).length

            return (
              <Link
                key={b.id}
                href={`/parent/messages/${b.id}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{b.students?.name}</p>
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                        {unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">with {tutorNames[b.tutor_id] ?? 'Tutor'}</p>
                  {last && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {last.sender_role === 'tutor' ? (tutorNames[b.tutor_id] ?? 'Tutor') : 'You'}: {last.body}
                    </p>
                  )}
                  {!last && (
                    <p className="text-xs text-muted-foreground mt-1 italic">No messages yet</p>
                  )}
                </div>
                {last && (
                  <span className="text-xs text-muted-foreground ml-4 shrink-0">
                    {format(new Date(last.created_at), 'd MMM')}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
