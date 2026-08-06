import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendNoticeEmail } from '@/lib/brevo'

const Schema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['info', 'warning', 'action']),
  notify: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()
  const { data: notices } = await admin
    .from('tutor_notices')
    .select('*, tutor_notice_dismissals(count)')
    .order('created_at', { ascending: false })
  return NextResponse.json(notices ?? [])
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { notify, ...noticeData } = parsed.data
  const admin = createAdminClient()
  const { data, error } = await admin.from('tutor_notices').insert(noticeData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (notify) {
    const { data: tutors } = await admin
      .from('tutors')
      .select('legal_name, email')
      .eq('active', true)

    if (tutors?.length) {
      await Promise.allSettled(
        tutors.map(t =>
          sendNoticeEmail({
            recipientName: t.legal_name,
            recipientEmail: t.email,
            message: noticeData.message,
            type: noticeData.type,
          })
        )
      )
    }
  }

  return NextResponse.json(data)
}
