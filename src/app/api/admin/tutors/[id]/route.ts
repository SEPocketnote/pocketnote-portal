import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  legal_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  abn: z.string().optional(),
  wwcc_number: z.string().optional(),
  wwcc_expiry: z.string().optional(),
  date_of_birth: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  year_levels: z.array(z.string()).optional(),
  credentials: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updates: Record<string, any> = { ...parsed.data }

  // If verifying, stamp the timestamp
  if (updates.verified === true) updates.verified_at = new Date().toISOString()
  if (updates.verified === false) updates.verified_at = null

  // Blank strings → null for optional fields
  for (const key of ['phone', 'location', 'state', 'postcode', 'address', 'bio', 'abn', 'wwcc_number', 'wwcc_expiry', 'date_of_birth']) {
    if (key in updates && updates[key] === '') updates[key] = null
  }

  const admin = createAdminClient()
  const { error } = await admin.from('tutors').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
