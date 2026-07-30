import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['tutor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, photo_url, bio, phone, abn, wwcc_number, wwcc_expiry, subjects, year_levels')
    .eq('user_id', user.id)
    .single()

  if (!tutor) return NextResponse.json({ error: 'Tutor record not found' }, { status: 404 })

  // Validate all required fields are filled
  const missing: string[] = []
  if (!tutor.photo_url) missing.push('profile photo')
  if (!tutor.bio?.trim()) missing.push('bio')
  if (!tutor.phone?.trim()) missing.push('phone number')
  if (!tutor.abn?.trim()) missing.push('ABN')
  if (!tutor.wwcc_number?.trim()) missing.push('WWCC number')
  if (!tutor.wwcc_expiry) missing.push('WWCC expiry date')
  if (!tutor.subjects?.length) missing.push('at least one subject')
  if (!tutor.year_levels?.length) missing.push('at least one year level')

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Please complete the following before finishing setup: ${missing.join(', ')}.` },
      { status: 422 }
    )
  }

  // Validate at least one availability slot is set
  const { count } = await supabase
    .from('tutor_availability')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', tutor.id)

  if (!count || count === 0) {
    return NextResponse.json(
      { error: 'Please add at least one availability slot before completing setup.' },
      { status: 422 }
    )
  }

  const now = new Date().toISOString()

  const [tutorResult, profileResult] = await Promise.all([
    supabase.from('tutors').update({ onboarding_completed_at: now }).eq('id', tutor.id),
    supabase.from('profiles').update({ tos_accepted_at: now }).eq('id', user.id),
  ])

  if (tutorResult.error || profileResult.error) {
    return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
