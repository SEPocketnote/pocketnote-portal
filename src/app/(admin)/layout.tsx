import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const cookieStore = await cookies()
  const lastSeenInvoices = cookieStore.get('invoices_last_seen')?.value

  const invoicesQuery = supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'submitted')

  const [{ count: unreadMessages }, { count: pendingInvoices }] = await Promise.all([
    supabase.from('messages').select('*', { count: 'exact', head: true }).is('read_at', null),
    lastSeenInvoices ? invoicesQuery.gt('submitted_at', lastSeenInvoices) : invoicesQuery,
  ])

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminNav
        email={user.email ?? ''}
        navCounts={{ messages: unreadMessages ?? 0, invoices: pendingInvoices ?? 0 }}
      />
      <main className="flex-1 pt-20 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}
