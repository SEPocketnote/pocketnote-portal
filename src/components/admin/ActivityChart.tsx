'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

export type ChartWeek = {
  label: string   // e.g. "28 Jul"
  sessions: number
  enquiries: number
  bookings: number
}

const OPTIONS = [
  { key: '8w', label: '8 weeks' },
  { key: '3m', label: '3 months' },
] as const

const COLORS = {
  sessions:  '#E05A4B',   // coral primary
  enquiries: '#F4A836',   // amber
  bookings:  '#6C9FE4',   // blue
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-card px-4 py-3 text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
          <span className="capitalize text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ActivityChart({ data }: { data: ChartWeek[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-sm leading-tight">Activity</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sessions, enquiries &amp; bookings over time</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.sessions} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.sessions} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradEnquiries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.enquiries} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.enquiries} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.bookings} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.bookings} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece9e5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              name="Sessions"
              stroke={COLORS.sessions}
              strokeWidth={2.5}
              fill="url(#gradSessions)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="enquiries"
              name="Enquiries"
              stroke={COLORS.enquiries}
              strokeWidth={2.5}
              fill="url(#gradEnquiries)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="bookings"
              name="Bookings"
              stroke={COLORS.bookings}
              strokeWidth={2.5}
              fill="url(#gradBookings)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
