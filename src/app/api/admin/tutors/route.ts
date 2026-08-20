import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTutorInvite } from '@/lib/brevo'
import { uniqueSlug } from '@/lib/slug'
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
  wwccNumber: z.string().optional(),
  wwccExpiry: z.string().optional(),
  credentials: z.array(z.string()).default([]),
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

  const { legalName, email, phone, location, state, postcode, subjects, yearLevels, wwccNumber, wwccExpiry, credentials } = parsed.data
  const admin = createAdminClient()

  const slug = await uniqueSlug(legalName, async (s) => {
    const { data } = await admin.from('tutors').select('id').eq('slug', s).maybeSingle()
    return !!data
  })

  // Upsert tutor record — if email already exists, update details rather than duplicate
  const { data: tutor, error: tutorError } = await admin.from('tutors').upsert({
    legal_name: legalName,
    email: email.toLowerCase().trim(),
    slug,
    phone,
    location,
    state,
    postcode,
    subjects,
    year_levels: yearLevels,
    wwcc_number: wwccNumber || null,
    wwcc_expiry: wwccExpiry || null,
    credentials,
    active: false,
    verified: false,
  }, { onConflict: 'email' }).select('id').single()

  if (tutorError) {
    console.error('[tutors] upsert error:', tutorError)
    return NextResponse.json({ error: 'Failed to create tutor' }, { status: 500 })
  }

  const tutorEmail = email.toLowerCase().trim()

  // Create Supabase auth account for tutor (or look up existing)
  let authUserId: string | undefined
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: tutorEmail,
    email_confirm: true,
  })

  if (!authError && authUser.user) {
    authUserId = authUser.user.id
  } else {
    // User already exists — fetch their ID
    const { data: { users } } = await admin.auth.admin.listUsers()
    const existing = users.find(u => u.email?.toLowerCase() === tutorEmail)
    if (existing) authUserId = existing.id
  }

  let inviteUrl: string | undefined
  if (authUserId) {
    await admin.from('tutors').update({ user_id: authUserId }).eq('id', tutor.id)
    await admin.from('profiles').upsert({ id: authUserId, role: 'tutor' }, { onConflict: 'id' })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: tutorEmail,
    })
    const tokenHash = linkData?.properties?.hashed_token
    inviteUrl = tokenHash ? `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=magiclink` : undefined
  }


  // Send portal invite email via Brevo
  try {
    await sendTutorInvite({ name: legalName, email: tutorEmail, inviteUrl })
  } catch (err) {
    console.error('[tutors] invite email failed:', err)
    return NextResponse.json({ id: tutor.id, emailError: (err as Error).message })
  }

  return NextResponse.json({ id: tutor.id })
}
