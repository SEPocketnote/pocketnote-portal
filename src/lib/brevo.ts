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
    throw new Error(`[brevo] ${path} failed ${res.status}: ${text}`)
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

export async function sendTutorInvite({ name, email, inviteUrl }: { name: string; email: string; inviteUrl?: string }) {
  const firstName = name.split(' ')[0]
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`
  const ctaUrl = inviteUrl ?? loginUrl
  const ctaLabel = inviteUrl ? 'Accept invitation' : 'Sign in to your portal'
  const bodyNote = inviteUrl
    ? 'Click the button below to accept your invitation and access your portal. This link is valid for 24 hours.'
    : 'You can sign in at any time using your email address — no password needed.'

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email, name }],
    subject: 'Welcome to Pocketnote — your tutor portal is ready',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Welcome, ${firstName}!</h1>
            </td></tr>

            <tr><td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                We've set up your Pocketnote tutor portal. ${bodyNote}
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${ctaUrl}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                ${ctaLabel}
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendTutorApprovedEmail({ name, email }: { name: string; email: string }) {
  const firstName = name.split(' ')[0]
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email, name }],
    subject: "You're approved — welcome to the Pocketnote team!",
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">You&apos;re approved, ${firstName}!</h1>
            </td></tr>

            <tr><td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                Your Pocketnote profile has been reviewed and approved. You&apos;re now part of the team — sign in to your portal to get started.
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${loginUrl}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Go to my portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we&apos;ll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendParentWelcome({
  name,
  email,
  tutorName,
  firstSession,
  inviteUrl,
}: {
  name: string
  email: string
  tutorName?: string
  firstSession?: string
  inviteUrl?: string
}) {
  const firstName = name.split(' ')[0]
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`
  const ctaUrl = inviteUrl ?? loginUrl
  const isBookingConfirm = !!tutorName
  const subject = isBookingConfirm
    ? 'Your Pocketnote sessions are confirmed'
    : 'Your Pocketnote parent portal is ready'
  const bodyNote = inviteUrl
    ? 'Click the button below to access your parent portal. This link is valid for 24 hours.'
    : 'You can sign in at any time using your email address — no password needed.'

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email, name }],
    subject,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                ${isBookingConfirm ? `Sessions confirmed, ${firstName}!` : `Welcome, ${firstName}!`}
              </h1>
            </td></tr>

            ${isBookingConfirm ? `
            <tr><td style="padding-bottom:20px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
                Your sessions with <strong>${tutorName}</strong> are confirmed.
              </p>
              ${firstSession ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${firstSession}</strong></p>` : ''}
            </td></tr>
            ` : ''}

            <tr><td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                ${isBookingConfirm ? `View your upcoming sessions and progress reports in your parent portal. ${bodyNote}` : bodyNote}
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${ctaUrl}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Access your parent portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendMessageNotification({
  recipientName,
  recipientEmail,
  senderName,
  messagePreview,
  portalPath,
}: {
  recipientName: string
  recipientEmail: string
  senderName: string
  messagePreview: string
  portalPath: string
}) {
  const firstName = recipientName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${portalPath}`
  const preview = messagePreview.length > 120 ? messagePreview.slice(0, 120) + '…' : messagePreview

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `New message from ${senderName}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                New message from ${senderName}
              </h1>
            </td></tr>

            <tr><td style="padding-bottom:24px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi ${firstName}, you have a new message waiting for you.
              </p>
            </td></tr>

            <tr><td style="padding-bottom:28px;">
              <div style="background-color:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;">
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">${preview}</p>
              </div>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View message
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function createBrevoDeal({
  name,
  email,
}: {
  name: string
  email: string
}): Promise<void> {
  const dealRes = await fetch(`${BASE}/crm/deals`, {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      name,
      ...(process.env.BREVO_DEALS_PIPELINE_ID && { pipelineId: process.env.BREVO_DEALS_PIPELINE_ID }),
      ...(process.env.BREVO_DEALS_PIPELINE_STAGE_ID && { stageId: process.env.BREVO_DEALS_PIPELINE_STAGE_ID }),
    }),
  })

  if (!dealRes.ok) {
    console.error('[brevo] createBrevoDeal failed:', await dealRes.text())
    return
  }

  const { id: dealId } = await dealRes.json()

  // Get contact's numeric ID so we can link the deal
  const contactRes = await fetch(`${BASE}/contacts/${encodeURIComponent(email)}`, {
    headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' },
  })

  if (!contactRes.ok || !dealId) return

  const { id: contactId } = await contactRes.json()

  if (contactId) {
    await fetch(`${BASE}/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ linkedContactsIds: [contactId] }),
    })
  }
}

export async function sendSessionReminder({
  recipientName,
  recipientEmail,
  studentName,
  tutorName,
  sessionDatetime,
  mode,
  location,
  portalPath,
}: {
  recipientName: string
  recipientEmail: string
  studentName: string
  tutorName: string
  sessionDatetime: string
  mode: string
  location?: string | null
  portalPath: string
}) {
  const firstName = recipientName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${portalPath}`
  const modeLabel = mode === 'online' ? 'Online' : location ?? 'In-person'

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `Session reminder — ${studentName} tomorrow`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Session tomorrow, ${firstName}</h1>
            </td></tr>

            <tr><td style="padding-bottom:28px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                Just a reminder that you have a session coming up.
              </p>
            </td></tr>

            <tr><td style="padding-bottom:28px;">
              <div style="background-color:#f9f8f6;border-radius:12px;padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Student</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Tutor</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${tutorName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">When</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${sessionDatetime}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;">Where</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;">${modeLabel}</td>
                  </tr>
                </table>
              </div>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View in portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendCancellationNotification({
  recipientName,
  recipientEmail,
  studentName,
  tutorName,
  sessionDatetime,
  mode,
  location,
  portalPath,
}: {
  recipientName: string
  recipientEmail: string
  studentName: string
  tutorName: string
  sessionDatetime: string
  mode: string
  location?: string | null
  portalPath: string
}) {
  const firstName = recipientName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${portalPath}`
  const modeLabel = mode === 'online' ? 'Online' : location ?? 'In-person'

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `Session cancelled — ${studentName}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Session cancelled, ${firstName}</h1>
            </td></tr>

            <tr><td style="padding-bottom:28px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                The following session has been cancelled. Please contact us if you have any questions.
              </p>
            </td></tr>

            <tr><td style="padding-bottom:28px;">
              <div style="background-color:#f9f8f6;border-radius:12px;padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Student</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Tutor</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${tutorName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">When</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${sessionDatetime}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;">Where</td>
                    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;">${modeLabel}</td>
                  </tr>
                </table>
              </div>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View in portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAdminInvite({ email, inviteUrl }: { email: string; inviteUrl: string }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`
  const ctaUrl = inviteUrl ?? loginUrl

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email }],
    subject: 'You\'ve been invited to Pocketnote admin',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Admin access to Pocketnote</h1>
            </td></tr>

            <tr><td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                You've been granted admin access to the Pocketnote portal. Click the button below to sign in — this link is valid for 24 hours.
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${ctaUrl}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Sign in to Pocketnote
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendInvoiceStatusEmail({
  recipientName,
  recipientEmail,
  status,
  invoiceRef,
  totalCents,
  rejectionReason,
}: {
  recipientName: string
  recipientEmail: string
  status: 'approved' | 'paid' | 'rejected'
  invoiceRef: string
  totalCents: number
  rejectionReason?: string | null
}) {
  const firstName = recipientName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/tutor/earnings`
  const totalDisplay = `$${(totalCents / 100).toFixed(2)}`

  const config = {
    approved: {
      subject: `Invoice #${invoiceRef} approved`,
      heading: `Invoice approved, ${firstName}`,
      body: `Your invoice of <strong>${totalDisplay}</strong> has been approved by Pocketnote admin. Payment will be processed shortly.`,
      accent: '#3b82f6',
    },
    paid: {
      subject: `Invoice #${invoiceRef} — payment sent`,
      heading: `Payment sent, ${firstName}!`,
      body: `Great news — your invoice of <strong>${totalDisplay}</strong> has been marked as paid. Please allow 1–3 business days for it to appear in your account.`,
      accent: '#10b981',
    },
    rejected: {
      subject: `Invoice #${invoiceRef} — action required`,
      heading: `Invoice returned, ${firstName}`,
      body: rejectionReason
        ? `Your invoice of <strong>${totalDisplay}</strong> has been returned by admin with the following note:<br/><br/><em>${rejectionReason}</em><br/><br/>Please review and resubmit.`
        : `Your invoice of <strong>${totalDisplay}</strong> has been returned by admin. Please review and resubmit.`,
      accent: '#ef4444',
    },
  }[status]

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: config.subject,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:4px;text-align:center;">
              <div style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${config.accent};margin-bottom:12px;"></div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">${config.heading}</h1>
            </td></tr>

            <tr><td style="padding:16px 0 28px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">${config.body}</p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View earnings
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendBookingConfirmation({
  name,
  email,
  tutorName,
  firstSession,
}: {
  name: string
  email: string
  tutorName: string
  firstSession: string
}) {
  const firstName = name.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/parent`

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email, name }],
    subject: 'Your Pocketnote sessions are confirmed',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Sessions confirmed, ${firstName}!</h1>
            </td></tr>

            <tr><td style="padding-bottom:20px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
                Your sessions with <strong>${tutorName}</strong> are confirmed.
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${firstSession}</strong></p>
            </td></tr>

            <tr><td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
                View upcoming sessions and progress reports in your parent portal.
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View your portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendNoticeEmail({
  recipientName,
  recipientEmail,
  message,
  type,
}: {
  recipientName: string
  recipientEmail: string
  message: string
  type: 'info' | 'warning' | 'action'
}) {
  const firstName = recipientName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/tutor`

  const subjectMap = {
    info: 'A notice from Pocketnote',
    warning: 'Important notice from Pocketnote',
    action: 'Action required — Pocketnote',
  }
  const accentMap = {
    info: '#3b82f6',
    warning: '#f59e0b',
    action: '#ef4444',
  }

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: subjectMap[type],
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>

        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Hi ${firstName},</h1>
            </td></tr>

            <tr><td style="padding-bottom:28px;">
              <div style="background-color:#f9f8f6;border-left:3px solid ${accentMap[type]};border-radius:0 8px 8px 0;padding:16px 20px;">
                <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${message}</p>
              </div>
            </td></tr>

            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                View your portal
              </a>
            </td></tr>

            <tr><td style="padding-bottom:24px;">
              <div style="height:1px;background-color:#f0eeeb;"></div>
            </td></tr>

            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you have any questions, reply to this email and we'll get back to you.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendChangeRequestAdminAlert(data: {
  parentName: string
  studentName: string
  requestType: 'reschedule' | 'cancellation'
  sessionDate: string
  parentNote: string | null
  proposedDatetime: string | null
  requestId: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const requestUrl = `${siteUrl}/admin/requests`
  const typeLabel = data.requestType === 'reschedule' ? 'Reschedule request' : 'Cancellation request'

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Portal' },
    to: (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'tara@pocketnote.com.au')
      .split(',')
      .map((e: string) => ({ email: e.trim() }))
      .filter((e: { email: string }) => e.email),
    subject: `${typeLabel} — ${data.studentName} (${data.sessionDate})`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${typeLabel}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${data.parentName} has submitted a request that needs your action.</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;padding:4px;">
            <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Student</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.studentName}</td></tr>
            <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Session</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.sessionDate}</td></tr>
            <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Type</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.requestType === 'reschedule' ? 'Reschedule' : 'Cancellation'}</td></tr>
            ${data.proposedDatetime ? `<tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Proposed time</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.proposedDatetime}</td></tr>` : ''}
            ${data.parentNote ? `<tr><td style="padding:10px 16px;"><strong style="font-size:13px;color:#374151;">Note</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.parentNote}</td></tr>` : ''}
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${requestUrl}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Review request</a>
          </div>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendChangeRequestResolution(data: {
  parentName: string
  parentEmail: string
  requestType: 'reschedule' | 'cancellation'
  studentName: string
  sessionDate: string
  approved: boolean
  newDatetime?: string | null
  adminNote?: string | null
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const firstName = data.parentName.split(' ')[0]
  const typeLabel = data.requestType === 'reschedule' ? 'reschedule' : 'cancellation'

  const heading = data.approved
    ? `Your ${typeLabel} request has been approved`
    : `Your ${typeLabel} request could not be accommodated`

  const bodyText = data.approved
    ? data.requestType === 'reschedule' && data.newDatetime
      ? `Your session for ${data.studentName} has been rescheduled to <strong>${data.newDatetime}</strong>.`
      : data.requestType === 'cancellation'
      ? `The session for ${data.studentName} on ${data.sessionDate} has been cancelled.`
      : `Your request for ${data.studentName}'s session on ${data.sessionDate} has been approved.`
    : `Unfortunately we weren't able to accommodate your request for ${data.studentName}'s session on ${data.sessionDate}. Please get in touch if you'd like to discuss alternatives.`

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: data.parentEmail, name: data.parentName }],
    subject: heading,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${bodyText}</p>
          ${data.adminNote ? `<div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;"><p style="margin:0;font-size:14px;color:#374151;font-style:italic;">${data.adminNote}</p></div>` : ''}
          <a href="${siteUrl}/parent" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my sessions</a>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAddressChangeAdminAlert(data: {
  parentName: string
  currentAddress: string | null
  proposedAddress: string
  parentNote: string | null
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Portal' },
    to: (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'tara@pocketnote.com.au')
      .split(',')
      .map((e: string) => ({ email: e.trim() }))
      .filter((e: { email: string }) => e.email),
    subject: `Address update request — ${data.parentName}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Address update request</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${data.parentName} has requested a session address update.</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
            ${data.currentAddress ? `<tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Current address</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.currentAddress}</td></tr>` : ''}
            <tr><td style="padding:10px 16px;${data.parentNote ? 'border-bottom:1px solid #f0eeeb;' : ''}"><strong style="font-size:13px;color:#374151;">Proposed address</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.proposedAddress}</td></tr>
            ${data.parentNote ? `<tr><td style="padding:10px 16px;"><strong style="font-size:13px;color:#374151;">Note</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${data.parentNote}</td></tr>` : ''}
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${siteUrl}/admin/requests" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Review request</a>
          </div>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAddressChangeTutorAlert(data: {
  tutorName: string
  tutorEmail: string
  parentName: string
  studentName: string
  newAddress: string
  adminNote: string | null
}) {
  const firstName = data.tutorName.split(' ')[0]
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: data.tutorEmail, name: data.tutorName }],
    subject: `Session address updated — ${data.studentName}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Session address updated</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${firstName}, the in-person session address for <strong>${data.studentName}</strong> (${data.parentName}) has been updated.</p>
          <div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">New address</p>
            <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">${data.newAddress}</p>
          </div>
          ${data.adminNote ? `<p style="font-size:14px;color:#374151;font-style:italic;margin-bottom:24px;">${data.adminNote}</p>` : ''}
          <p style="margin:0;font-size:14px;color:#6b7280;">Please make note of this updated address for your upcoming sessions. If you have any questions, reply to this email.</p>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAddressChangeResolution(data: {
  parentName: string
  parentEmail: string
  approved: boolean
  proposedAddress: string
  adminNote: string | null
}) {
  const firstName = data.parentName.split(' ')[0]
  const heading = data.approved ? 'Your address has been updated' : 'Address update request — not actioned'
  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: data.parentEmail, name: data.parentName }],
    subject: heading,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${firstName},${data.approved
            ? ` your session address has been updated to <strong>${data.proposedAddress}</strong>. Your tutor has been notified.`
            : " we weren't able to update your session address at this time. Please get in touch if you'd like to discuss further."
          }</p>
          ${data.adminNote ? `<div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;"><p style="margin:0;font-size:14px;color:#374151;font-style:italic;">${data.adminNote}</p></div>` : ''}
          <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/parent/account" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my account</a>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendAvailabilityConflictAdmin(data: {
  tutorName: string
  tutorEmail: string
  slotLabel: string
  conflicts: Array<{ studentName: string; sessionDate: string }>
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const rows = data.conflicts.map(c =>
    `<tr><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${c.studentName}</td><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${c.sessionDate}</td></tr>`
  ).join('')

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Portal' },
    to: (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'tara@pocketnote.com.au')
      .split(',').map((e: string) => ({ email: e.trim() })).filter((e: { email: string }) => e.email),
    subject: `Availability conflict — ${data.tutorName} removed a slot with upcoming sessions`,
    htmlContent: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Availability conflict</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
            <strong>${data.tutorName}</strong> removed the availability slot <strong>${data.slotLabel}</strong>,
            which overlaps with the following upcoming session${data.conflicts.length !== 1 ? 's' : ''}:
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
            <tr>
              <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Student</th>
              <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Session time</th>
            </tr>
            ${rows}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Please follow up with ${data.tutorName} (${data.tutorEmail}) to confirm these sessions are still going ahead.</p>
          <div style="margin-top:24px;text-align:center;">
            <a href="${siteUrl}/admin/tutors" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View tutor</a>
          </div>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
}

export async function sendAvailabilityConflictTutor(data: {
  tutorName: string
  tutorEmail: string
  slotLabel: string
  conflicts: Array<{ studentName: string; sessionDate: string }>
}) {
  const rows = data.conflicts.map(c =>
    `<tr><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${c.studentName}</td><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${c.sessionDate}</td></tr>`
  ).join('')

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote Portal' },
    to: [{ email: data.tutorEmail }],
    subject: `Heads up — your availability change affects upcoming sessions`,
    htmlContent: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Availability change notice</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
            Hi ${data.tutorName}, you removed the availability slot <strong>${data.slotLabel}</strong>.
            We noticed this overlaps with the following upcoming session${data.conflicts.length !== 1 ? 's' : ''}:
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
            <tr>
              <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Student</th>
              <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Session time</th>
            </tr>
            ${rows}
          </table>
          <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
            These sessions are still scheduled. Please contact Pocketnote if you have any concerns about your upcoming commitments.
          </p>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
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
    to: (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'tara@pocketnote.com.au')
      .split(',')
      .map(e => ({ email: e.trim() }))
      .filter(e => e.email),
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

export async function sendTutorBookingNotification({
  tutorName,
  tutorEmail,
  studentName,
  parentName,
  parentPhone,
  parentEmail,
  firstSession,
  mode,
  location,
}: {
  tutorName: string
  tutorEmail: string
  studentName: string
  parentName: string
  parentPhone?: string | null
  parentEmail: string
  firstSession: string
  mode: string
  location?: string | null
}) {
  const firstName = tutorName.split(' ')[0]
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/tutor/students`

  await brevoRequest('/smtp/email', {
    sender: { email: 'updates@info.pocketnotetutors.com.au', name: 'Pocketnote' },
    to: [{ email: tutorEmail, name: tutorName }],
    subject: `New student — ${studentName}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding-bottom:12px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">New enrolment, ${firstName}!</h1>
            </td></tr>
            <tr><td style="padding-bottom:24px;text-align:center;">
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">You have a new student: <strong>${studentName}</strong></p>
              <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${firstSession}</strong></p>
            </td></tr>
            <tr><td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f8f6;border-radius:10px;padding:16px 20px;">
                <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;width:110px;">Parent</td><td style="font-size:13px;color:#111827;font-weight:500;">${parentName}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Phone</td><td style="font-size:13px;color:#111827;">${parentPhone || '—'}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Email</td><td style="font-size:13px;color:#111827;">${parentEmail}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Mode</td><td style="font-size:13px;color:#111827;text-transform:capitalize;">${mode}${location ? ` · ${location}` : ''}</td></tr>
              </table>
            </td></tr>
            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${url}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View your students</a>
            </td></tr>
            <tr><td style="padding-bottom:24px;"><div style="height:1px;background-color:#f0eeeb;"></div></td></tr>
            <tr><td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">If you have any questions, reply to this email and we'll get back to you.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <p style="margin:0 0 8px;font-size:12px;">
            <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
            <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
