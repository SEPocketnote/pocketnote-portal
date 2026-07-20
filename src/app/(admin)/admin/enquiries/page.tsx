import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  contacted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: enquiries } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Enquiries</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {['', 'new', 'contacted', 'confirmed', 'waitlisted'].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/enquiries?status=${s}` : '/admin/enquiries'}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              (status ?? '') === s
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-foreground border-border hover:border-primary'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </Link>
        ))}
      </div>

      {!enquiries?.length ? (
        <p className="text-muted-foreground text-sm">No enquiries yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subjects</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enquiries.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:text-primary">
                      {e.parent_name}
                    </Link>
                    <div className="text-muted-foreground text-xs">{e.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {e.student_name}
                    <div className="text-muted-foreground text-xs">{e.year_level}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.subjects?.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status] ?? ''}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
