import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function AdminMessagesPage() {
  const supabase = await createClient()

  const [{ data: bookings }, { data: messages }] = await Promise.all([
    supabase.from('bookings')
      .select('id, students(name), parents(name), tutors(legal_name, preferred_name)')
      .in('status', ['confirmed', 'completed'])
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

  // Sort bookings: those with messages first (by last message time), then the rest
  const sorted = [...(bookings ?? [])].sort((a, b) => {
    const aLast = msgsByBooking[a.id]?.[0]?.created_at ?? ''
    const bLast = msgsByBooking[b.id]?.[0]?.created_at ?? ''
    return bLast.localeCompare(aLast)
  })

  const withMessages = sorted.filter(b => msgsByBooking[b.id]?.length)
  const withoutMessages = sorted.filter(b => !msgsByBooking[b.id]?.length)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>

      {!bookings?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center text-sm text-muted-foreground">
          No bookings yet.
        </div>
      ) : (
        <div className="space-y-6">
          {withMessages.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Active threads</p>
              <div className="bg-white rounded-lg border border-border divide-y divide-border">
                {withMessages.map((b: any) => {
                  const msgs = msgsByBooking[b.id] ?? []
                  const last = msgs[0]
                  return (
                    <Link
                      key={b.id}
                      href={`/admin/messages/${b.id}`}
                      className="flex items-center justify-between px-4 py-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.students?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.parents?.name} ↔ {(b.tutors as any)?.preferred_name?.trim() || b.tutors?.legal_name}
                        </p>
                        {last && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {last.sender_role === 'parent' ? b.parents?.name : (b.tutors as any)?.preferred_name?.trim() || b.tutors?.legal_name}: {last.body}
                          </p>
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
            </section>
          )}

          {withoutMessages.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">No messages yet</p>
              <div className="bg-white rounded-lg border border-border divide-y divide-border">
                {withoutMessages.map((b: any) => (
                  <Link
                    key={b.id}
                    href={`/admin/messages/${b.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{b.students?.name}</p>
                      <p className="text-xs text-muted-foreground">{b.parents?.name} ↔ {(b.tutors as any)?.preferred_name?.trim() || b.tutors?.legal_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground italic">No messages</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
