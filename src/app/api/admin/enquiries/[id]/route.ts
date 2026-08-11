import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  parentName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  studentName: z.string().min(1).optional(),
  yearLevel: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  location: z.string().optional(),
  modePreference: z.enum(['in-person', 'online', 'either']).optional(),
  preferredDays: z.array(z.string()).optional(),
  preferredTimes: z.string().nullable().optional(),
  howHeard: z.string().nullable().optional(),
  status: z.enum(['new', 'contacted', 'confirmed', 'waitlisted', 'unconverted']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const d = parsed.data
  const updates: Record<string, unknown> = {}
  if (d.parentName !== undefined) updates.parent_name = d.parentName
  if (d.email !== undefined) updates.email = d.email
  if ('phone' in d) updates.phone = d.phone
  if (d.studentName !== undefined) updates.student_name = d.studentName
  if (d.yearLevel !== undefined) updates.year_level = d.yearLevel
  if (d.subjects !== undefined) updates.subjects = d.subjects
  if (d.location !== undefined) updates.location = d.location
  if (d.modePreference !== undefined) updates.mode_preference = d.modePreference
  if (d.preferredDays !== undefined) updates.preferred_days = d.preferredDays
  if ('preferredTimes' in d) updates.preferred_times = d.preferredTimes
  if ('howHeard' in d) updates.how_heard = d.howHeard
  if (d.status !== undefined) updates.status = d.status

  const { error } = await supabase.from('enquiries').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('enquiries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
