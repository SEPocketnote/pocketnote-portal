import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const abn = request.nextUrl.searchParams.get('abn')?.replace(/\s/g, '')
  if (!abn) return NextResponse.json({ error: 'Missing ABN' }, { status: 400 })

  const guid = process.env.ABR_GUID
  if (!guid) return NextResponse.json({ error: 'ABR_GUID not configured' }, { status: 500 })

  const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}`
  const text = await fetch(url).then(r => r.text())

  // ABR returns JSONP: callback({...})
  const json = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '')
  const data = JSON.parse(json)

  if (data.Message) return NextResponse.json({ error: data.Message }, { status: 400 })

  return NextResponse.json({
    abn: data.Abn,
    name: data.EntityName,
    type: data.EntityTypeName,
    status: data.AbnStatus, // 'Active' | 'Cancelled'
    state: data.AddressState,
    postcode: data.AddressPostcode,
  })
}
