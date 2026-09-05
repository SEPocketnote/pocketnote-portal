import { createHash } from 'crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function hashPhone(raw: string): string {
  // Normalise to E.164-ish: digits only, prefix with 61 for AU numbers starting with 0
  const digits = raw.replace(/\D/g, '')
  const normalised = digits.startsWith('0') ? '61' + digits.slice(1) : digits
  return createHash('sha256').update(normalised).digest('hex')
}

export async function sendMetaLeadEvent({
  email,
  phone,
  firstName,
  lastName,
  sourceUrl = 'https://pocketnote.com.au',
}: {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  sourceUrl?: string
}) {
  const pixelId = process.env.META_PIXEL_ID
  const token = process.env.META_CAPI_TOKEN
  if (!pixelId || !token) return

  const userData: Record<string, string[]> = {
    em: [sha256(email)],
  }
  if (phone) userData.ph = [hashPhone(phone)]
  if (firstName) userData.fn = [sha256(firstName)]
  if (lastName) userData.ln = [sha256(lastName)]

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: sourceUrl,
      user_data: userData,
    }],
    access_token: token,
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meta CAPI ${res.status}: ${text}`)
  }
}
