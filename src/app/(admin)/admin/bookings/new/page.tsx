import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import NewBookingForm from './NewBookingForm'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; parentId?: string }>
}) {
  const { from, parentId } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: tutors }, { data: availability }] = await Promise.all([
    supabase.from('tutors').select('id, legal_name, subjects, year_levels, location, state, postcode, mode').eq('active', true).order('legal_name'),
    supabase.from('tutor_availability').select('tutor_id, day_of_week').order('day_of_week'),
  ])

  let initialValues: Record<string, string> | undefined
  let preselectedParent: { id: string; name: string; email: string; phone: string | null; students: any[] } | null = null
  let backHref = '/admin/sessions'

  // Pre-fill from enquiry
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
    backHref = `/admin/enquiries/${from}`
  }

  // Pre-fill from parent profile
  if (parentId) {
    const { data: parent } = await admin
      .from('parents')
      .select('id, name, email, phone, students(id, name, year_level, subjects)')
      .eq('id', parentId)
      .single()

    if (parent) {
      preselectedParent = {
        id: parent.id,
        name: parent.name ?? '',
        email: parent.email ?? '',
        phone: parent.phone ?? null,
        students: (parent.students as any[]) ?? [],
      }
    }
    backHref = `/admin/parents/${parentId}`
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Create enrolment</h1>
      <NewBookingForm
        tutors={tutors ?? []}
        availability={availability ?? []}
        initialValues={initialValues}
        preselectedParent={preselectedParent}
      />
    </div>
  )
}
