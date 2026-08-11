import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, startOfDay, endOfDay, addDays, subWeeks, startOfWeek } from 'date-fns'
import { Inbox, Users2, CalendarDays, TrendingUp, BookOpen } from 'lucide-react'
import PeriodToggle from './PeriodToggle'
import ActivityChart, { type ChartWeek } from '@/components/admin/ActivityChart'

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

  // Chart: 8 weeks of history
  const chartStart = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 })

  const [
    { count: newEnquiries },
    { count: activeBookings },
    { count: sessionsPeriod },
    { data: upcomingSessions },
    { data: recentEnquiries },
    { data: chartSessions },
    { data: chartEnquiries },
    { data: chartBookings },
  ] = await Promise.all([
    supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('sessions')
      .select('*, bookings!inner(status)', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .eq('bookings.status', 'confirmed')
      .gte('scheduled_at', startOfDay(now).toISOString())
      .lte('scheduled_at', periodEnd.toISOString()),
    supabase.from('sessions')
      .select(`
        id, scheduled_at,
        bookings!inner (
          id, status,
          students ( name ),
          tutors ( legal_name, preferred_name )
        )
      `)
      .eq('status', 'scheduled')
      .eq('bookings.status', 'confirmed')
      .gte('scheduled_at', startOfDay(now).toISOString())
      .lte('scheduled_at', periodEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50),
    supabase.from('enquiries')
      .select('id, parent_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('sessions')
      .select('scheduled_at')
      .gte('scheduled_at', chartStart.toISOString())
      .lte('scheduled_at', now.toISOString()),
    supabase.from('enquiries')
      .select('created_at')
      .gte('created_at', chartStart.toISOString())
      .lte('created_at', now.toISOString()),
    supabase.from('bookings')
      .select('created_at')
      .gte('created_at', chartStart.toISOString())
      .lte('created_at', now.toISOString()),
  ])

  // Build chart weeks
  const weeks: ChartWeek[] = []
  for (let i = 0; i < 8; i++) {
    const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 })
    const weekEnd = endOfDay(addDays(weekStart, 6))
    const label = format(weekStart, 'd MMM')
    const inRange = (iso: string) => {
      const d = new Date(iso)
      return d >= weekStart && d <= weekEnd
    }
    weeks.push({
      label,
      sessions:  (chartSessions  ?? []).filter(s => inRange(s.scheduled_at)).length,
      enquiries: (chartEnquiries ?? []).filter(e => inRange(e.created_at)).length,
      bookings:  (chartBookings  ?? []).filter(b => inRange(b.created_at)).length,
    })
  }

  return (
    <div className="max-w-5xl space-y-5">

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/75 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -right-2 w-24 h-24 bg-white/5 rounded-full" />
        <h1 className="text-2xl font-bold mb-1 relative">Welcome back</h1>
        <p className="text-white/80 text-sm relative">Here&apos;s what&apos;s happening at Pocketnote.</p>
        <div className="flex flex-wrap gap-5 mt-4 relative">
          {(newEnquiries ?? 0) > 0 && (
            <div className="bg-white/15 rounded-xl px-4 py-2.5 text-center">
              <p className="text-xl font-bold text-white">{newEnquiries}</p>
              <p className="text-white/75 text-xs">{newEnquiries === 1 ? 'New enquiry' : 'New enquiries'}</p>
            </div>
          )}
          <div className="bg-white/15 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xl font-bold text-white">{activeBookings ?? 0}</p>
            <p className="text-white/75 text-xs">Active students</p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xl font-bold text-white">{sessionsPeriod ?? 0}</p>
            <p className="text-white/75 text-xs">Sessions — {PERIOD_LABEL[period].toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={Inbox}
          label="New enquiries"
          value={newEnquiries ?? 0}
          href="/admin/enquiries"
          highlight={!!newEnquiries}
        />
        <StatCard
          icon={Users2}
          label="Active students"
          value={activeBookings ?? 0}
          href="/admin/bookings"
        />
        <StatCard
          icon={CalendarDays}
          label={`Sessions — ${PERIOD_LABEL[period].toLowerCase()}`}
          value={sessionsPeriod ?? 0}
        />
      </div>

      {/* Activity chart */}
      <ActivityChart data={weeks} />

      {/* Two-column: upcoming sessions | recent enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Upcoming sessions */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">Upcoming sessions</h2>
                <p className="text-[11px] text-muted-foreground">{PERIOD_LABEL[period].toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodToggle current={period} />
            </div>
          </div>

          {!upcomingSessions?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No sessions scheduled in the {PERIOD_LABEL[period].toLowerCase()}.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upcomingSessions.map((s: any) => {
                const booking = s.bookings
                return (
                  <Link
                    key={s.id}
                    href={`/admin/bookings/${booking?.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{booking?.students?.name}</p>
                      <p className="text-xs text-muted-foreground">with {(booking?.tutors as any)?.preferred_name?.trim() || (booking?.tutors as any)?.legal_name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm">{format(new Date(s.scheduled_at), 'EEE d MMM')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), 'h:mm a')}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-border/50">
            <Link href="/admin/bookings" className="text-xs text-primary hover:underline">All bookings →</Link>
          </div>
        </div>

        {/* Recent enquiries */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-border/50">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">Recent enquiries</h2>
              <p className="text-[11px] text-muted-foreground">Latest submissions</p>
            </div>
          </div>

          {!recentEnquiries?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No enquiries yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentEnquiries.map((e: any) => (
                <Link
                  key={e.id}
                  href={`/admin/enquiries/${e.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.parent_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), 'd MMM')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === 'new'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-border/50">
            <Link href="/admin/enquiries" className="text-xs text-primary hover:underline">All enquiries →</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, href, highlight }: {
  icon: React.ElementType
  label: string
  value: number
  href?: string
  highlight?: boolean
}) {
  const inner = (
    <div className={`bg-white rounded-2xl shadow-md p-5 transition-colors ${
      href ? 'hover:shadow-lg cursor-pointer' : ''
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
        highlight ? 'bg-primary/10' : 'bg-muted'
      }`}>
        <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}
