import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TutorNav from '@/components/tutor/TutorNav'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['tutor', 'admin'].includes(profile.role)) redirect('/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('legal_name')
    .eq('user_id', user.id)
    .single()

  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_role', 'parent')
    .is('read_at', null)

  return (
    <div className="min-h-screen bg-muted/30">
      {profile.role === 'admin' && (
        <div className="bg-primary text-primary-foreground text-xs text-center py-1.5 px-4">
          Admin preview — viewing tutor portal{' '}
          <a href="/admin" className="underline font-medium">Back to admin</a>
        </div>
      )}
      <TutorNav name={tutor?.legal_name ?? user.email ?? ''} unreadMessages={unreadMessages ?? 0} />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
