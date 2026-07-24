import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1),
  hourly_rate_cents: z.number().int().min(1),
  description: z.string().optional(),
  sort_order: z.number().int().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorised', status: 401 }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 }
  return { user }
}

export async function GET() {
  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rate_tiers')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rate_tiers: data })
}

export async function POST(request: Request) {
  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rate_tiers')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rate_tier: data })
}
