import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STATE_MAP: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 4) return NextResponse.json([])

  const params = new URLSearchParams({
    q: `${q}, Australia`,
    countrycodes: 'au',
    addressdetails: '1',
    format: 'json',
    limit: '6',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'User-Agent': 'Pocketnote Portal (pocketnote.com.au)',
      'Accept-Language': 'en',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return NextResponse.json([])

  const results: any[] = await res.json()

  const seen = new Set<string>()
  const addresses = results
    .filter(r => {
      const a = r.address
      return a?.road && a?.postcode && a?.state && STATE_MAP[a.state]
    })
    .map(r => {
      const a = r.address
      const streetAddress = [a.house_number, a.road].filter(Boolean).join(' ')
      const suburb = a.suburb || a.town || a.village || a.city_district || a.hamlet || a.city || ''
      return {
        streetAddress,
        suburb,
        state: STATE_MAP[a.state],
        postcode: a.postcode,
        display: r.display_name,
      }
    })
    .filter(a => {
      if (seen.has(a.display)) return false
      seen.add(a.display)
      return true
    })

  return NextResponse.json(addresses)
}
