import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'
import PeriodToggle from './PeriodToggle'

const PERIOD_DAYS: Record<string, number> = {
  week: 7,
  fortnight: 14,
  month: 30,
}

const PERIOD_LABEL: Record<string, string> = {
  week: 'Next 7 days',
  fortnight: 'Next 14 days',
  month: 'Next 30 days',
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod = 'fortnight' } = await searchParams
  const period = rawPeriod in PERIOD_DAYS ? rawPeriod : 'fortnight'
  const days = PERIOD_DAYS[period]

  const supabase = await createClient()
  const now = new Date()
  const periodEnd = endOfDay(addDays(now, days))

  const [
    { count: newEnquiries },
    { count: activeBookings },
    { count: sessionsPeriod },
    { data: upcomingSessions },
    { data: recentEnquiries },
  ] = await Promise.all([
    supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_at', startOfDay(now).toISOString())
      .lte('scheduled_at', periodEnd.toISOString()),
    supabase.from('sessions')
      .select(`
        id, scheduled_at,
        bookings (
          id,
          students ( name ),
          tutors ( legal_name )
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', startOfDay(now).toISOString())
      .lte('scheduled_at', periodEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50),
    supabase.from('enquiries')
      .select('id, parent_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="New enquiries"
          value={newEnquiries ?? 0}
          href="/admin/enquiries"
          highlight={!!newEnquiries}
        />
        <StatCard
          label="Active students"
          value={activeBookings ?? 0}
          href="/admin/bookings"
        />
        <StatCard
          label={`Sessions — ${PERIOD_LABEL[period].toLowerCase()}`}
          value={sessionsPeriod ?? 0}
        />
      </div>

      {/* Upcoming sessions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming sessions — {PERIOD_LABEL[period].toLowerCase()}
          </h2>
          <div className="flex items-center gap-3">
            <PeriodToggle current={period} />
            <Link href="/admin/bookings" className="text-xs text-primary hover:underline">
              All bookings →
            </Link>
          </div>
        </div>

        {!upcomingSessions?.length ? (
          <div className="bg-white rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No sessions scheduled in the {PERIOD_LABEL[period].toLowerCase()}.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {upcomingSessions.map((s: any) => {
              const booking = s.bookings
              return (
                <Link
                  key={s.id}
                  href={`/admin/bookings/${booking?.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{booking?.students?.name}</p>
                    <p className="text-xs text-muted-foreground">with {booking?.tutors?.legal_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{format(new Date(s.scheduled_at), 'EEE d MMM')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), 'h:mm a')}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent enquiries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent enquiries
          </h2>
          <Link href="/admin/enquiries" className="text-xs text-primary hover:underline">
            All enquiries →
          </Link>
        </div>

        {!recentEnquiries?.length ? (
          <div className="bg-white rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No enquiries yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border divide-y divide-border">
            {recentEnquiries.map((e: any) => (
              <Link
                key={e.id}
                href={`/admin/enquiries/${e.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{e.parent_name}</p>
                  <p className="text-xs text-muted-foreground">{e.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.created_at), 'd MMM')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === 'new'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {e.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, href, highlight }: {
  label: string
  value: number
  href?: string
  highlight?: boolean
}) {
  const inner = (
    <div className={`bg-white rounded-lg border p-5 transition-colors ${
      highlight ? 'border-primary' : 'border-border'
    } ${href ? 'hover:bg-muted/20 cursor-pointer' : ''}`}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}
