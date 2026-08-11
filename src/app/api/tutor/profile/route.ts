import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  bio: z.string().optional(),
  preferred_name: z.string().optional(),
  abn: z.string().optional(),
  gst_registered: z.boolean().optional(),
  wwcc_number: z.string().optional(),
  wwcc_expiry: z.string().optional(),
  date_of_birth: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  year_levels: z.array(z.string()).optional(),
  credentials: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
  mode: z.enum(['online', 'in-person', 'either']).optional(),
  bank_details: z.object({
    account_name: z.string(),
    bsb: z.string(),
    account_number: z.string(),
  }).nullable().optional(),
  super_details: z.object({
    fund_name: z.string(),
    fund_abn: z.string(),
    usi: z.string(),
    member_number: z.string(),
  }).nullable().optional(),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updates: Record<string, any> = { ...parsed.data }

  // Blank strings → null
  for (const key of ['phone', 'address', 'location', 'state', 'postcode', 'bio', 'preferred_name', 'abn', 'wwcc_number', 'wwcc_expiry', 'date_of_birth']) {
    if (key in updates && updates[key] === '') updates[key] = null
  }

  const { error } = await supabase
    .from('tutors')
    .update(updates)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
