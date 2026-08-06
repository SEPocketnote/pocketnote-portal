import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import EnquirySearch from './EnquirySearch'
import SortableHeader from './SortableHeader'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  contacted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  waitlisted: 'bg-yellow-100 text-yellow-700',
  unconverted: 'bg-gray-100 text-gray-500',
}

const FILTER_TABS = ['', 'new', 'contacted', 'confirmed', 'waitlisted', 'unconverted']

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string; dir?: string }>
}) {
  const { status, q, sort, dir } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('enquiries').select('*')

  if (status) query = query.eq('status', status)
  if (q) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`parent_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
  }

  const sortField = sort === 'status' ? 'status' : 'created_at'
  query = query.order(sortField, { ascending: dir === 'asc' })

  const { data: enquiries } = await query

  // Param objects for child components
  const allParams: Record<string, string> = {}
  if (q) allParams.q = q
  if (status) allParams.status = status
  if (sort) allParams.sort = sort
  if (dir) allParams.dir = dir

  // Sort headers: preserve q + status, let header set sort + dir
  const sortBase: Record<string, string> = {}
  if (q) sortBase.q = q
  if (status) sortBase.status = status

  // Search input: preserve status + sort + dir, let search set q
  const searchBase: Record<string, string> = {}
  if (status) searchBase.status = status
  if (sort) searchBase.sort = sort
  if (dir) searchBase.dir = dir

  // Filter tabs: preserve q + sort + dir, tab sets status
  function tabHref(s: string) {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (sort) params.sort = sort
    if (dir) params.dir = dir
    if (s) params.status = s
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return `/admin/enquiries${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <Link
          href="/admin/enquiries/new"
          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          + New enquiry
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((s) => (
            <Link
              key={s}
              href={tabHref(s)}
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

        {/* Search */}
        <EnquirySearch defaultValue={q} baseParams={searchBase} />
      </div>

      {!enquiries?.length ? (
        <p className="text-muted-foreground text-sm">No enquiries found.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {enquiries.map((e) => (
              <Link
                key={e.id}
                href={`/admin/enquiries/${e.id}`}
                className="flex items-start justify-between gap-3 bg-white rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.parent_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.student_name}{e.year_level ? ` · ${e.year_level}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[e.status] ?? ''}`}>
                    {e.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subjects</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader column="status" label="Status" currentSort={sort} currentDir={dir} baseParams={sortBase} />
                  </th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader column="received" label="Received" currentSort={sort} currentDir={dir} baseParams={sortBase} />
                  </th>
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[e.status] ?? ''}`}>
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
        </>
      )}
    </div>
  )
}
