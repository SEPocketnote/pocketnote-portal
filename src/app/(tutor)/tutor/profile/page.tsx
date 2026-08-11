import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function TutorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, legal_name, preferred_name, email, phone, address, bio, abn, gst_registered, wwcc_number, wwcc_expiry, date_of_birth, subjects, year_levels, location, state, postcode, photo_url, credentials, bank_details, super_details, mode')
    .eq('user_id', user!.id)
    .single()

  if (!tutor) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">Profile not found. Contact Pocketnote for help.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">My Profile</h1>
      <ProfileForm tutor={tutor} />
    </div>
  )
}
