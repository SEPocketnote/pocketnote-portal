import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TutorNav from '@/components/tutor/TutorNav'
import { tutorDisplayName } from '@/lib/tutor-display'

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
    .select('legal_name, preferred_name, photo_url, onboarding_completed_at')
    .eq('user_id', user.id)
    .single()

  // Gate: redirect tutors who haven't completed onboarding (admins bypass)
  if (profile.role !== 'admin' && tutor && !tutor.onboarding_completed_at) {
    redirect('/tutor/onboarding')
  }

  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_role', 'parent')
    .is('read_at', null)

  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      {profile.role === 'admin' && (
        <div className="bg-primary text-primary-foreground text-xs text-center py-1.5 px-4 relative z-50">
          Admin preview — viewing tutor portal{' '}
          <a href="/admin" className="underline font-medium">Back to admin</a>
        </div>
      )}
      <div className="flex min-h-screen">
        <TutorNav name={tutor ? tutorDisplayName(tutor) : user.email ?? ''} photoUrl={tutor?.photo_url} unreadMessages={unreadMessages ?? 0} />
        <main className="flex-1 pt-20 p-4 md:p-8 overflow-auto flex flex-col">
          <div className="flex-1 bg-[#F5F4F2]">{children}</div>
          <footer className="mt-12 pt-4 border-t border-border text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Pocketnote. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  )
}
