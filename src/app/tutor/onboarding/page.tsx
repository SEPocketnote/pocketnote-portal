import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from './OnboardingFlow'

export default async function TutorOnboardingPage() {
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
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tutor) redirect('/login')

  // Already completed — send to portal
  if (tutor.onboarding_completed_at && profile.role !== 'admin') redirect('/tutor')

  const { data: availabilitySlots } = await supabase
    .from('tutor_availability')
    .select('id, day_of_week, start_time, end_time')
    .eq('tutor_id', tutor.id)
    .order('day_of_week')
    .order('start_time')

  return (
    <div className="min-h-screen bg-muted/30">
      <OnboardingFlow tutor={tutor} initialSlots={availabilitySlots ?? []} />
    </div>
  )
}
