import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: parent } = await supabase
    .from('parents')
    .select('name, email, phone')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="bg-white rounded-lg border border-border p-6 space-y-4">
        <Row label="Name" value={parent?.name ?? '—'} />
        <Row label="Email" value={parent?.email ?? user?.email ?? '—'} />
        <Row label="Phone" value={parent?.phone ?? '—'} />
      </div>

      <p className="text-xs text-muted-foreground">
        To update your details, contact us at{' '}
        <a href="mailto:hello@pocketnote.com.au" className="text-primary hover:underline">
          hello@pocketnote.com.au
        </a>
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
