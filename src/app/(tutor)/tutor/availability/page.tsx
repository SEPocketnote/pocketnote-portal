import { createClient } from '@/lib/supabase/server'
import AvailabilityGrid from './AvailabilityGrid'

export default async function TutorAvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Availability</h1>
        <p className="text-sm text-muted-foreground">No tutor profile found for this account.</p>
      </div>
    )
  }

  const { data: slots } = await supabase
    .from('tutor_availability')
    .select('id, day_of_week, start_time, end_time')
    .eq('tutor_id', tutor.id)
    .order('day_of_week')
    .order('start_time')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set your recurring weekly availability so we know when you can take sessions.
        </p>
      </div>
      <AvailabilityGrid initialSlots={slots ?? []} />
    </div>
  )
}
