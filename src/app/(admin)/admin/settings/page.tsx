import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage business configuration and admin preferences.</p>
      <div className="bg-white rounded-2xl shadow-md divide-y divide-border">
        <Link href="/admin/settings/rate-tiers" className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div>
            <p className="font-medium">Rate Tiers</p>
            <p className="text-sm text-muted-foreground">Manage tutor pay tiers and hourly rates</p>
          </div>
          <span className="text-muted-foreground text-lg">›</span>
        </Link>
      </div>
    </div>
  )
}
