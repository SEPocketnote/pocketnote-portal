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
