import { createClient } from '@/lib/supabase/server'
import NewBookingForm from './NewBookingForm'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const supabase = await createClient()

  const [{ data: tutors }, { data: availability }] = await Promise.all([
    supabase.from('tutors').select('id, legal_name, subjects, year_levels, location, state, postcode').eq('active', true).order('legal_name'),
    supabase.from('tutor_availability').select('tutor_id, day_of_week').order('day_of_week'),
  ])

  // Pre-fill from enquiry if ?from=<enquiry_id>
  let initialValues: Record<string, string> | undefined
  if (from) {
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('parent_name, email, phone, student_name, year_level, subjects, mode_preference, location')
      .eq('id', from)
      .single()

    if (enquiry) {
      initialValues = {
        parentName: enquiry.parent_name ?? '',
        parentEmail: enquiry.email ?? '',
        parentPhone: enquiry.phone ?? '',
        studentName: enquiry.student_name ?? '',
        yearLevel: enquiry.year_level ?? '',
        subjects: (enquiry.subjects as string[] | null)?.join(', ') ?? '',
        mode: enquiry.mode_preference === 'in-person' ? 'in-person' : 'online',
        location: enquiry.location ?? '',
      }
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href={from ? `/admin/enquiries/${from}` : '/admin/bookings'}
          className="text-sm text-muted-foreground hover:text-primary">
          ← Back
        </a>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Create booking</h1>
      <NewBookingForm
        tutors={tutors ?? []}
        availability={availability ?? []}
        initialValues={initialValues}
      />
    </div>
  )
}
