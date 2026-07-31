import { createAdminClient } from '@/lib/supabase/admin'
import NoticesClient from './NoticesClient'

export const dynamic = 'force-dynamic'

export default async function NoticesPage() {
  const admin = createAdminClient()

  const { data: notices } = await admin
    .from('tutor_notices')
    .select('id, message, type, active, created_at, expires_at')
    .order('created_at', { ascending: false })

  // Dismiss counts per notice
  const ids = (notices ?? []).map(n => n.id)
  const { data: dismissals } = ids.length
    ? await admin.from('tutor_notice_dismissals').select('notice_id').in('notice_id', ids)
    : { data: [] }

  const dismissCounts: Record<string, number> = {}
  for (const d of dismissals ?? []) {
    dismissCounts[d.notice_id] = (dismissCounts[d.notice_id] ?? 0) + 1
  }

  const noticesWithCounts = (notices ?? []).map(n => ({
    ...n,
    dismissCount: dismissCounts[n.id] ?? 0,
  }))

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Tutor Notices</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Notices appear as banners on every tutor&apos;s dashboard. Tutors can dismiss them individually.
      </p>
      <NoticesClient notices={noticesWithCounts} />
    </div>
  )
}
