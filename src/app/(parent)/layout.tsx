import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ParentNav from '@/components/parent/ParentNav'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['parent', 'admin'].includes(profile.role)) redirect('/login')

  const { data: parent } = await supabase
    .from('parents')
    .select('name')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-muted/30">
      {profile.role === 'admin' && (
        <div className="bg-primary text-primary-foreground text-xs text-center py-1.5 px-4">
          Admin preview — viewing parent portal{' '}
          <a href="/admin" className="underline font-medium">Back to admin</a>
        </div>
      )}
      <ParentNav name={parent?.name ?? user.email ?? ''} />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
