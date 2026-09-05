import { createHash } from 'crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export async function sendMetaLeadEvent({
  email,
  phone,
  firstName,
  eventId,
  clientIp,
  userAgent,
  sourceUrl = 'https://pocketnote.com.au/book-now/',
}: {
  email: string
  phone?: string
  firstName?: string
  eventId?: string
  clientIp?: string
  userAgent?: string
  sourceUrl?: string
}) {
  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_CAPI_TOKEN
  if (!pixelId || !token) return

  const userData: Record<string, unknown> = {
    em: [sha256(email)],
  }
  if (phone) userData.ph = [sha256(phone.replace(/\D/g, ''))]
  if (firstName) userData.fn = [sha256(firstName)]
  if (clientIp) userData.client_ip_address = clientIp
  if (userAgent) userData.client_user_agent = userAgent

  const event: Record<string, unknown> = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: sourceUrl,
    user_data: userData,
  }
  if (eventId) event.event_id = eventId

  const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: [event], access_token: token }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meta CAPI ${res.status}: ${text}`)
  }
}
