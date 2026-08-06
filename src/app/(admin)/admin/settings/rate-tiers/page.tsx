import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RateTiersList from './RateTiersList'

export const dynamic = 'force-dynamic'

export default async function RateTiersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: tiers }, { data: tutors }] = await Promise.all([
    admin.from('rate_tiers').select('*').order('sort_order', { ascending: true }),
    admin.from('tutors').select('rate_tier_id').not('rate_tier_id', 'is', null),
  ])

  // Count tutors per tier
  const tierCounts: Record<string, number> = {}
  for (const t of tutors ?? []) {
    if (t.rate_tier_id) {
      tierCounts[t.rate_tier_id] = (tierCounts[t.rate_tier_id] ?? 0) + 1
    }
  }

  const tiersWithCounts = (tiers ?? []).map(tier => ({
    ...tier,
    tutor_count: tierCounts[tier.id] ?? 0,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <a href="/admin/settings" className="text-sm text-muted-foreground hover:text-primary">← Back to settings</a>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Rate Tiers</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage tutor pay tiers. Each tier has separate online and in-person rates.</p>

      <RateTiersList tiers={tiersWithCounts} />
    </div>
  )
}
