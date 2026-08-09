import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import ParentNav from '@/components/parent/ParentNav'
import SetupGateModal from '@/components/parent/SetupGateModal'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tos_accepted_at')
    .eq('id', user.id)
    .single()

  if (!profile || !['parent', 'admin'].includes(profile.role)) redirect('/login')

  const { data: parent } = await supabase
    .from('parents')
    .select('id, name, stripe_customer_id, default_payment_method_id')
    .eq('user_id', user.id)
    .single()

  // For existing Stripe customers (e.g. migrated parents), check if Stripe already has
  // a default payment method and backfill our DB so they skip the gate automatically.
  let resolvedPaymentMethodId = parent?.default_payment_method_id ?? null
  if (parent && !resolvedPaymentMethodId && parent.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(parent.stripe_customer_id)
      if (!('deleted' in customer)) {
        const existingPmId =
          typeof customer.invoice_settings?.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : (customer.invoice_settings?.default_payment_method as any)?.id ?? null
        if (existingPmId) {
          const admin = createAdminClient()
          await admin.from('parents').update({ default_payment_method_id: existingPmId }).eq('id', parent.id)
          resolvedPaymentMethodId = existingPmId
        }
      }
    } catch { /* non-fatal — gate will show if Stripe is unreachable */ }
  }

  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_role', 'tutor')
    .is('read_at', null)

  const needsSetup = profile.role !== 'admin' && (!profile.tos_accepted_at || !resolvedPaymentMethodId)

  return (
    <div className="min-h-screen bg-muted/30">
      {profile.role === 'admin' && (
        <div className="bg-primary text-primary-foreground text-xs text-center py-1.5 px-4 relative z-50">
          Admin preview — viewing parent portal{' '}
          <a href="/admin" className="underline font-medium">Back to admin</a>
        </div>
      )}
      {needsSetup && <SetupGateModal />}
      <div className="flex min-h-screen">
        <ParentNav name={parent?.name ?? user.email ?? ''} unreadMessages={unreadMessages ?? 0} />
        <main className="flex-1 pt-20 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
