import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(1).optional(),
  year_level: z.string().optional(),
  subjects: z.array(z.string()).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify student belongs to this parent
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', id)
    .eq('parent_id', parent.id)
    .single()
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updates: Record<string, any> = { ...parsed.data }
  if ('year_level' in updates && updates.year_level === '') updates.year_level = null

  const { error } = await supabase.from('students').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
