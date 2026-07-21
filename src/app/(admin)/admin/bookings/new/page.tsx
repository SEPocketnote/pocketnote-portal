import { createClient } from '@/lib/supabase/server'
import NewBookingForm from './NewBookingForm'

export default async function NewBookingPage() {
  const supabase = await createClient()

  const [{ data: tutors }, { data: packages }, { data: availability }] = await Promise.all([
    supabase.from('tutors').select('id, legal_name, subjects, year_levels, location').eq('active', true).order('legal_name'),
    supabase.from('packages').select('*').eq('active', true).order('sessions_total'),
    supabase.from('tutor_availability').select('tutor_id, day_of_week').order('day_of_week'),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/admin/bookings" className="text-sm text-muted-foreground hover:text-primary">← Back to bookings</a>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Create booking</h1>
      <NewBookingForm tutors={tutors ?? []} packages={packages ?? []} availability={availability ?? []} />
    </div>
  )
}
