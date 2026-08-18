import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TutorsSearch from './TutorsSearch'

export default async function TutorsPage() {
  const supabase = await createClient()

  const { data: tutors } = await supabase
    .from('tutors')
    .select('id, legal_name, email, phone, subjects, location, state, postcode, active, verified, wwcc_expiry')
    .order('legal_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tutors</h1>
        <Link
          href="/admin/tutors/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          Add tutor
        </Link>
      </div>

      {!tutors?.length ? (
        <div className="bg-white rounded-2xl shadow-md p-10 text-center">
          <p className="font-medium mb-1">No tutors yet</p>
          <p className="text-sm text-muted-foreground">Add your first tutor to get started.</p>
        </div>
      ) : (
        <TutorsSearch tutors={tutors as any} />
      )}
    </div>
  )
}
