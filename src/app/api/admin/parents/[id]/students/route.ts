import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(1),
  year_level: z.string().optional(),
  subjects: z.array(z.string()).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('students').insert({
    parent_id: parentId,
    name: parsed.data.name,
    year_level: parsed.data.year_level || null,
    subjects: parsed.data.subjects ?? [],
  }).select('id, name, year_level, subjects').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
