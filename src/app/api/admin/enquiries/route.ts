import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  parentName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  studentName: z.string().min(1),
  yearLevel: z.string().min(1),
  subjects: z.array(z.string()).min(1),
  location: z.string().min(1),
  modePreference: z.enum(['in-person', 'online', 'either']),
  preferredDays: z.array(z.string()).optional(),
  preferredTimes: z.string().optional(),
  howHeard: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const d = parsed.data
  const { data: enquiry, error } = await supabase
    .from('enquiries')
    .insert({
      parent_name: d.parentName,
      email: d.email,
      phone: d.phone || null,
      student_name: d.studentName,
      year_level: d.yearLevel,
      subjects: d.subjects,
      location: d.location,
      mode_preference: d.modePreference,
      preferred_days: d.preferredDays ?? [],
      preferred_times: d.preferredTimes || null,
      how_heard: d.howHeard || null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/enquiries] insert error:', error)
    return NextResponse.json({ error: 'Failed to save enquiry' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: enquiry.id })
}
