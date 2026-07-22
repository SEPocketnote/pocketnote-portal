import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTutorInvite } from '@/lib/brevo'
import { z } from 'zod'

const Schema = z.object({
  legalName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  subjects: z.array(z.string()).default([]),
  yearLevels: z.array(z.string()).default([]),
})

export async function POST(request: Request) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { legalName, email, phone, location, state, postcode, subjects, yearLevels } = parsed.data
  const admin = createAdminClient()

  // Create tutor record
  const { data: tutor, error: tutorError } = await admin.from('tutors').insert({
    legal_name: legalName,
    email: email.toLowerCase().trim(),
    phone,
    location,
    state,
    postcode,
    subjects,
    year_levels: yearLevels,
    active: false,
    verified: false,
  }).select('id').single()

  if (tutorError) {
    console.error('[tutors] insert error:', tutorError)
    return NextResponse.json({ error: 'Failed to create tutor' }, { status: 500 })
  }

  // Create Supabase auth account for tutor
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    email_confirm: true,
  })

  if (!authError && authUser.user) {
    // Link auth user to tutor record
    await admin.from('tutors').update({ user_id: authUser.user.id }).eq('id', tutor.id)
    // Set role to tutor
    await admin.from('profiles').upsert({ id: authUser.user.id, role: 'tutor' }, { onConflict: 'id' })
  }

  // Send portal invite email via Brevo (non-blocking — tutor is created regardless)
  sendTutorInvite({ name: legalName, email: email.toLowerCase().trim() }).catch(err =>
    console.error('[tutors] invite email failed:', err)
  )

  return NextResponse.json({ id: tutor.id })
}
