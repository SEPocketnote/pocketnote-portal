const BREVO_API_KEY = process.env.BREVO_API_KEY!
const BASE = 'https://api.brevo.com/v3'

async function brevoRequest(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[brevo] ${path} failed ${res.status}: ${text}`)
  }
}

export async function upsertBrevoContact({
  email,
  firstName,
  lastName,
  listIds,
  attributes,
}: {
  email: string
  firstName?: string
  lastName?: string
  listIds?: number[]
  attributes?: Record<string, unknown>
}) {
  // Try update first; if 404 create
  const updateRes = await fetch(`${BASE}/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      attributes: { FIRSTNAME: firstName, LASTNAME: lastName, ...attributes },
      listIds,
    }),
  })

  if (updateRes.status === 404) {
    await brevoRequest('/contacts', {
      email,
      attributes: { FIRSTNAME: firstName, LASTNAME: lastName, ...attributes },
      listIds,
      updateEnabled: true,
    })
  }
}

export async function sendTutorInvite({ name, email }: { name: string; email: string }) {
  const firstName = name.split(' ')[0]
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Tutors' },
    to: [{ email, name }],
    subject: 'Welcome to Pocketnote — your tutor portal is ready',
    htmlContent: `
      <p>Hi ${firstName},</p>
      <p>Welcome to Pocketnote! We've set up your tutor portal.</p>
      <p>Sign in at any time using your email address — no password needed:</p>
      <p><a href="${loginUrl}" style="background:#E26F6F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Access your portal</a></p>
      <p>If you have any questions, reply to this email and we'll get back to you.</p>
      <p>The Pocketnote team</p>
    `,
  })
}

export async function sendParentWelcome({
  name,
  email,
  tutorName,
  firstSession,
}: {
  name: string
  email: string
  tutorName: string
  firstSession?: string
}) {
  const firstName = name.split(' ')[0]
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Tutors' },
    to: [{ email, name }],
    subject: 'Your Pocketnote sessions are confirmed',
    htmlContent: `
      <p>Hi ${firstName},</p>
      <p>Great news — your sessions with <strong>${tutorName}</strong> are confirmed.</p>
      ${firstSession ? `<p>Your first session is scheduled for <strong>${firstSession}</strong>.</p>` : ''}
      <p>You can view your upcoming sessions and progress reports in your parent portal:</p>
      <p><a href="${loginUrl}" style="background:#E26F6F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View your portal</a></p>
      <p>If you have any questions, reply to this email.</p>
      <p>The Pocketnote team</p>
    `,
  })
}

export async function sendEnquiryNotification(data: {
  parentName: string
  email: string
  phone?: string
  studentName: string
  yearLevel: string
  subjects: string[]
  location: string
  modePreference: string
  preferredDays?: string[]
  preferredTimes?: string
  howHeard?: string
}) {
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Portal' },
    to: [{ email: process.env.ADMIN_EMAIL || 'tara@pocketnote.com.au' }],
    subject: `New enquiry — ${data.studentName} (${data.yearLevel})`,
    htmlContent: `
      <h2>New Enquiry</h2>
      <table cellpadding="6" style="font-family:sans-serif;font-size:14px">
        <tr><td><strong>Parent</strong></td><td>${data.parentName}</td></tr>
        <tr><td><strong>Email</strong></td><td>${data.email}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${data.phone || '—'}</td></tr>
        <tr><td><strong>Student</strong></td><td>${data.studentName}</td></tr>
        <tr><td><strong>Year level</strong></td><td>${data.yearLevel}</td></tr>
        <tr><td><strong>Subjects</strong></td><td>${data.subjects.join(', ')}</td></tr>
        <tr><td><strong>Location</strong></td><td>${data.location}</td></tr>
        <tr><td><strong>Mode</strong></td><td>${data.modePreference}</td></tr>
        <tr><td><strong>Preferred days</strong></td><td>${data.preferredDays?.join(', ') || '—'}</td></tr>
        <tr><td><strong>Preferred times</strong></td><td>${data.preferredTimes || '—'}</td></tr>
        <tr><td><strong>How heard</strong></td><td>${data.howHeard || '—'}</td></tr>
      </table>
    `,
  })
}
