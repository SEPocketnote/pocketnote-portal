import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const type = req.nextUrl.searchParams.get('type')
  if (!['licence', 'wwcc'].includes(type ?? '')) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: tutor } = await admin.from('tutors').select('licence_url, wwcc_url').eq('id', id).single()
  if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const path = type === 'licence' ? tutor.licence_url : tutor.wwcc_url
  if (!path) return NextResponse.json({ error: 'No document uploaded' }, { status: 404 })

  const { data, error } = await admin.storage
    .from('tutor-documents')
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate link' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
