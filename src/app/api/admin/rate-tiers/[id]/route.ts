import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  hourly_rate_cents: z.number().int().min(1).optional(),
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rate_tiers')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rate_tier: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const admin = createAdminClient()

  // Check no tutors are assigned to this tier
  const { count } = await admin
    .from('tutors')
    .select('*', { count: 'exact', head: true })
    .eq('rate_tier_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} tutor${count === 1 ? ' is' : 's are'} assigned to this tier.` },
      { status: 400 },
    )
  }

  const { error } = await admin.from('rate_tiers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
