import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function TutorMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors').select('id').eq('user_id', user!.id).single()

  if (!tutor) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Messages</h1>
        <p className="text-sm text-muted-foreground">No tutor profile found.</p>
      </div>
    )
  }

  const [{ data: bookings }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, students(name), parents(name)')
      .eq('tutor_id', tutor.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false }),
    supabase.from('messages')
      .select('id, booking_id, sender_role, body, read_at, created_at')
      .order('created_at', { ascending: false }),
  ])

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
            const unread = msgs.filter(m => m.sender_role === 'parent' && !m.read_at).length

            return (
              <Link
                key={b.id}
                href={`/tutor/messages/${b.id}`}
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
                  <p className="text-xs text-muted-foreground mt-0.5">{b.parents?.name}</p>
                  {last && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {last.sender_role === 'parent' ? b.parents?.name : 'You'}: {last.body}
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
