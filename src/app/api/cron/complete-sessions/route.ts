import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by Vercel Cron every 15 minutes.
// Marks any 'scheduled' sessions whose time has passed as 'completed',
// assuming they went ahead if not explicitly cancelled.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sessions')
    .update({ status: 'completed' })
    .eq('status', 'scheduled')
    .lt('scheduled_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('[cron/complete-sessions]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/complete-sessions] marked ${data?.length ?? 0} session(s) completed`)
  return NextResponse.json({ completed: data?.length ?? 0 })
}
