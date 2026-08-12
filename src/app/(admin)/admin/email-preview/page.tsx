import EmailPreviewClient, { type EmailPreview } from './EmailPreviewClient'

// ─── Sample data ────────────────────────────────────────────────────────────
const P_NAME = 'Sarah Johnson', P_FIRST = 'Sarah', P_EMAIL = 'sarah@example.com'
const T_NAME = 'James Chen', T_FIRST = 'James', T_EMAIL = 'james@example.com'
const S_NAME = 'Emma Johnson'
const SESSION_DT = 'Thursday, 14 Aug 2026 at 4:00 PM'
const LOCATION = '22 Park Street, Bondi NSW 2026'
const SITE = 'https://pocketnote-portal.vercel.app'
const LINK = '#sample-magic-link'

// ─── Shared fragments ───────────────────────────────────────────────────────
const LOGO = `<tr><td align="center" style="padding-bottom:24px;"><span style="font-size:22px;font-weight:700;color:#E26F6F;letter-spacing:-0.5px;">Pocketnote</span></td></tr>`

const FOOTER = `<tr><td style="padding-top:28px;" align="center">
  <p style="margin:0 0 8px;font-size:12px;">
    <a href="https://pocketnote.com.au/privacy/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Privacy Policy</a>
    <a href="https://pocketnote.com.au/terms-service/" style="color:#9ca3af;text-decoration:underline;margin:0 12px;">Terms of Service</a>
  </p>
  <p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.<br />Sydney, NSW, Australia</p>
</td></tr>`

const FOOTER_SHORT = `<tr><td style="padding-top:28px;" align="center"><p style="margin:0;font-size:12px;color:#b0b7c3;">&copy; 2026 Pocketnote. All rights reserved.</p></td></tr>`

const DIVIDER = `<tr><td style="padding-bottom:24px;"><div style="height:1px;background-color:#f0eeeb;"></div></td></tr>`

const HELP = `<tr><td style="text-align:center;"><p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">If you have any questions, reply to this email and we'll get back to you.</p></td></tr>`

function btn(href: string, label: string) {
  return `<tr><td align="center" style="padding-bottom:32px;"><a href="${href}" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">${label}</a></td></tr>`
}

function h1(text: string) {
  return `<tr><td style="padding-bottom:12px;text-align:center;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">${text}</h1></td></tr>`
}

function para(text: string, style = 'font-size:15px;color:#6b7280;line-height:1.6;') {
  return `<tr><td style="padding-bottom:32px;text-align:center;"><p style="margin:0;${style}">${text}</p></td></tr>`
}

function detailBox(rows: string) {
  return `<tr><td style="padding-bottom:28px;"><div style="background-color:#f9f8f6;border-radius:12px;padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  </div></td></tr>`
}

function detailRow(label: string, value: string, last = false) {
  return `<tr>
    <td style="font-size:13px;color:#6b7280;${last ? '' : 'padding-bottom:6px;'}">${label}</td>
    <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;${last ? '' : 'padding-bottom:6px;'}">${value}</td>
  </tr>`
}

// Standard full-width email wrapper
function std(cardRows: string, footerHtml = FOOTER) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
${LOGO}
<tr><td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
${cardRows}
</table>
</td></tr>
${footerHtml}
</table>
</td></tr>
</table>
</body>
</html>`
}

// Admin alert wrapper (simpler card, no nested table)
function admin(cardHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4f0;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
${LOGO}
<tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
${cardHtml}
</td></tr>
${FOOTER_SHORT}
</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Email templates with sample data ───────────────────────────────────────
const EMAILS: EmailPreview[] = [

  // ── Onboarding ──────────────────────────────────────────────────────────
  {
    id: 'tutor-invite-link',
    group: 'Onboarding',
    label: 'Tutor invite (magic link)',
    subject: 'Welcome to Pocketnote — your tutor portal is ready',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`Welcome, ${T_FIRST}!`)}
      ${para(`We've set up your Pocketnote tutor portal. Click the button below to accept your invitation and access your portal. This link is valid for 24 hours.`)}
      ${btn(LINK, 'Accept invitation')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'tutor-invite-noop',
    group: 'Onboarding',
    label: 'Tutor invite (no link fallback)',
    subject: 'Welcome to Pocketnote — your tutor portal is ready',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`Welcome, ${T_FIRST}!`)}
      ${para(`We've set up your Pocketnote tutor portal. You can sign in at any time using your email address — no password needed.`)}
      ${btn(`${SITE}/login`, 'Sign in to your portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'parent-welcome-new-link',
    group: 'Onboarding',
    label: 'Parent welcome — new, with link',
    subject: 'Your Pocketnote sessions are confirmed',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Sessions confirmed, ${P_FIRST}!`)}
      <tr><td style="padding-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your sessions with <strong>${T_NAME}</strong> are confirmed.</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${SESSION_DT}</strong></p>
      </td></tr>
      ${para(`View your upcoming sessions and progress reports in your parent portal. Click the button below to access your parent portal. This link is valid for 24 hours.`)}
      ${btn(LINK, 'Access your parent portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'parent-welcome-new-noop',
    group: 'Onboarding',
    label: 'Parent welcome — new, no link',
    subject: 'Your Pocketnote sessions are confirmed',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Sessions confirmed, ${P_FIRST}!`)}
      <tr><td style="padding-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your sessions with <strong>${T_NAME}</strong> are confirmed.</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${SESSION_DT}</strong></p>
      </td></tr>
      ${para(`View your upcoming sessions and progress reports in your parent portal. You can sign in at any time using your email address — no password needed.`)}
      ${btn(`${SITE}/login`, 'Access your parent portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'parent-portal-ready',
    group: 'Onboarding',
    label: 'Parent portal ready (no booking)',
    subject: 'Your Pocketnote parent portal is ready',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Welcome, ${P_FIRST}!`)}
      ${para(`You can sign in at any time using your email address — no password needed.`)}
      ${btn(`${SITE}/login`, 'Access your parent portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'admin-invite',
    group: 'Onboarding',
    label: 'Admin invite',
    subject: "You've been invited to Pocketnote admin",
    recipient: 'tara@pocketnote.com.au',
    html: std(`
      ${h1('Admin access to Pocketnote')}
      ${para(`You've been granted admin access to the Pocketnote portal. Click the button below to sign in — this link is valid for 24 hours.`)}
      ${btn(LINK, 'Sign in to Pocketnote')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  // ── Sessions ─────────────────────────────────────────────────────────────
  {
    id: 'booking-confirm-existing',
    group: 'Sessions',
    label: 'Booking confirmation (existing parent)',
    subject: 'Your Pocketnote sessions are confirmed',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Sessions confirmed, ${P_FIRST}!`)}
      <tr><td style="padding-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your sessions with <strong>${T_NAME}</strong> are confirmed.</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${SESSION_DT}</strong></p>
      </td></tr>
      ${para('View upcoming sessions and progress reports in your parent portal.')}
      ${btn(`${SITE}/parent`, 'View your portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'session-reminder',
    group: 'Sessions',
    label: 'Session reminder (to parent)',
    subject: `Session reminder — ${S_NAME} tomorrow`,
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Session tomorrow, ${P_FIRST}`)}
      ${para('Just a reminder that you have a session coming up.')}
      ${detailBox(`
        ${detailRow('Student', S_NAME)}
        ${detailRow('Tutor', T_NAME)}
        ${detailRow('When', SESSION_DT)}
        ${detailRow('Where', LOCATION, true)}
      `)}
      ${btn(`${SITE}/parent`, 'View in portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'session-cancel',
    group: 'Sessions',
    label: 'Session cancelled (to parent)',
    subject: `Session cancelled — ${S_NAME}`,
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`Session cancelled, ${P_FIRST}`)}
      ${para('The following session has been cancelled. Please contact us if you have any questions.')}
      ${detailBox(`
        ${detailRow('Student', S_NAME)}
        ${detailRow('Tutor', T_NAME)}
        ${detailRow('When', SESSION_DT)}
        ${detailRow('Where', LOCATION, true)}
      `)}
      ${btn(`${SITE}/parent`, 'View in portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'tutor-new-booking',
    group: 'Sessions',
    label: 'Tutor — new student notification',
    subject: `New student — ${S_NAME}`,
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`New enrolment, ${T_FIRST}!`)}
      <tr><td style="padding-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">You have a new student: <strong>${S_NAME}</strong></p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">First session: <strong>${SESSION_DT}</strong></p>
      </td></tr>
      <tr><td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f8f6;border-radius:10px;padding:16px 20px;">
          <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;width:110px;">Parent</td><td style="font-size:13px;color:#111827;font-weight:500;">${P_NAME}</td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Phone</td><td style="font-size:13px;color:#111827;">0412 345 678</td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Email</td><td style="font-size:13px;color:#111827;">${P_EMAIL}</td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Mode</td><td style="font-size:13px;color:#111827;">In-person · ${LOCATION}</td></tr>
        </table>
      </td></tr>
      ${btn(`${SITE}/tutor/students`, 'View your students')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  // ── Invoices ──────────────────────────────────────────────────────────────
  {
    id: 'invoice-approved',
    group: 'Invoices',
    label: 'Invoice approved',
    subject: 'Invoice #INV-0042 approved',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      <tr><td style="padding-bottom:4px;text-align:center;">
        <div style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#3b82f6;margin-bottom:12px;"></div>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Invoice approved, ${T_FIRST}</h1>
      </td></tr>
      <tr><td style="padding:16px 0 28px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">Your invoice of <strong>$320.00</strong> has been approved by Pocketnote admin. Payment will be processed shortly.</p>
      </td></tr>
      ${btn(`${SITE}/tutor/earnings`, 'View earnings')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'invoice-paid',
    group: 'Invoices',
    label: 'Invoice paid',
    subject: 'Invoice #INV-0042 — payment sent',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      <tr><td style="padding-bottom:4px;text-align:center;">
        <div style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#10b981;margin-bottom:12px;"></div>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Payment sent, ${T_FIRST}!</h1>
      </td></tr>
      <tr><td style="padding:16px 0 28px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">Great news — your invoice of <strong>$320.00</strong> has been marked as paid. Please allow 1–3 business days for it to appear in your account.</p>
      </td></tr>
      ${btn(`${SITE}/tutor/earnings`, 'View earnings')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'invoice-rejected',
    group: 'Invoices',
    label: 'Invoice returned',
    subject: 'Invoice #INV-0042 — action required',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      <tr><td style="padding-bottom:4px;text-align:center;">
        <div style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#ef4444;margin-bottom:12px;"></div>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">Invoice returned, ${T_FIRST}</h1>
      </td></tr>
      <tr><td style="padding:16px 0 28px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">Your invoice of <strong>$320.00</strong> has been returned by admin with the following note:<br/><br/><em>The session on 7 Aug was already paid in last month's invoice — please remove and resubmit.</em><br/><br/>Please review and resubmit.</p>
      </td></tr>
      ${btn(`${SITE}/tutor/earnings`, 'View earnings')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  // ── Notices ───────────────────────────────────────────────────────────────
  {
    id: 'notice-info',
    group: 'Notices',
    label: 'Notice — info',
    subject: 'A notice from Pocketnote',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`Hi ${T_FIRST},`)}
      <tr><td style="padding-bottom:28px;">
        <div style="background-color:#f9f8f6;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Just a reminder that Pocketnote will be holding a tutor professional development session on Saturday 23 August at 10am. Check your email for the Zoom link.</p>
        </div>
      </td></tr>
      ${btn(`${SITE}/tutor`, 'View your portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'notice-warning',
    group: 'Notices',
    label: 'Notice — warning',
    subject: 'Important notice from Pocketnote',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`Hi ${T_FIRST},`)}
      <tr><td style="padding-bottom:28px;">
        <div style="background-color:#f9f8f6;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your Working With Children Check is due to expire on 30 September 2026. Please renew it and upload the new document to your profile as soon as possible.</p>
        </div>
      </td></tr>
      ${btn(`${SITE}/tutor`, 'View your portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  {
    id: 'notice-action',
    group: 'Notices',
    label: 'Notice — action required',
    subject: 'Action required — Pocketnote',
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: std(`
      ${h1(`Hi ${T_FIRST},`)}
      <tr><td style="padding-bottom:28px;">
        <div style="background-color:#f9f8f6;border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your Working With Children Check has expired. You will not be able to conduct sessions until you provide a valid WWCC number. Please update your profile immediately.</p>
        </div>
      </td></tr>
      ${btn(`${SITE}/tutor`, 'View your portal')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  {
    id: 'message-notification',
    group: 'Messages',
    label: 'New message notification',
    subject: `New message from ${T_NAME}`,
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: std(`
      ${h1(`New message from ${T_NAME}`)}
      <tr><td style="padding-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">Hi ${P_FIRST}, you have a new message waiting for you.</p>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <div style="background-color:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">Hi Sarah, just a heads up that Emma did really well this week on her algebra work. I've set some practice problems for her to try before our next session on Thursday.</p>
        </div>
      </td></tr>
      ${btn(`${SITE}/parent/messages`, 'View message')}
      ${DIVIDER}
      ${HELP}
    `),
  },

  // ── Change requests ───────────────────────────────────────────────────────
  {
    id: 'change-req-reschedule-admin',
    group: 'Admin alerts',
    label: 'Change request — reschedule (admin)',
    subject: `Reschedule request — ${S_NAME} (${SESSION_DT})`,
    recipient: 'tara@pocketnote.com.au, tim@pocketnote.com.au',
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reschedule request</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${P_NAME} has submitted a request that needs your action.</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;padding:4px;">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Student</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${S_NAME}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Session</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${SESSION_DT}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Type</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">Reschedule</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Proposed time</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">Friday, 15 Aug 2026 at 5:00 PM</td></tr>
        <tr><td style="padding:10px 16px;"><strong style="font-size:13px;color:#374151;">Note</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">Emma has a school event on Thursday — can we move to Friday instead?</td></tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${SITE}/admin/requests" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Review request</a>
      </div>
    `),
  },

  {
    id: 'change-req-cancel-admin',
    group: 'Admin alerts',
    label: 'Change request — cancellation (admin)',
    subject: `Cancellation request — ${S_NAME} (${SESSION_DT})`,
    recipient: 'tara@pocketnote.com.au, tim@pocketnote.com.au',
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Cancellation request</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${P_NAME} has submitted a request that needs your action.</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;padding:4px;">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Student</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${S_NAME}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Session</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${SESSION_DT}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Type</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">Cancellation</td></tr>
        <tr><td style="padding:10px 16px;"><strong style="font-size:13px;color:#374151;">Note</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">Emma is unwell this week — hope to resume next Thursday as normal.</td></tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${SITE}/admin/requests" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Review request</a>
      </div>
    `),
  },

  {
    id: 'change-req-resolution-approved',
    group: 'Admin alerts',
    label: 'Change request — approved (to parent)',
    subject: 'Your reschedule request has been approved',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Your reschedule request has been approved</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hi ${P_FIRST},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Your session for ${S_NAME} has been rescheduled to <strong>Friday, 15 Aug 2026 at 5:00 PM</strong>.</p>
      <div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">The tutor has been notified of the new time.</p>
      </div>
      <a href="${SITE}/parent" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my sessions</a>
    `),
  },

  {
    id: 'change-req-resolution-declined',
    group: 'Admin alerts',
    label: 'Change request — declined (to parent)',
    subject: "Your reschedule request could not be accommodated",
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Your reschedule request could not be accommodated</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hi ${P_FIRST},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Unfortunately we weren't able to accommodate your request for ${S_NAME}'s session on ${SESSION_DT}. Please get in touch if you'd like to discuss alternatives.</p>
      <a href="${SITE}/parent" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my sessions</a>
    `),
  },

  {
    id: 'address-change-admin',
    group: 'Admin alerts',
    label: 'Address change request (admin)',
    subject: `Address update request — ${P_NAME}`,
    recipient: 'tara@pocketnote.com.au, tim@pocketnote.com.au',
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Address update request</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${P_NAME} has requested a session address update.</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Current address</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">14 Ocean Ave, Manly NSW 2095</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #f0eeeb;"><strong style="font-size:13px;color:#374151;">Proposed address</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">${LOCATION}</td></tr>
        <tr><td style="padding:10px 16px;"><strong style="font-size:13px;color:#374151;">Note</strong></td><td style="padding:10px 16px;font-size:13px;color:#374151;">We've moved — new address from next week.</td></tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${SITE}/admin/requests" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Review request</a>
      </div>
    `),
  },

  {
    id: 'address-change-tutor',
    group: 'Admin alerts',
    label: 'Address change alert (to tutor)',
    subject: `Session address updated — ${S_NAME}`,
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Session address updated</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${T_FIRST}, the in-person session address for <strong>${S_NAME}</strong> (${P_NAME}) has been updated.</p>
      <div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">New address</p>
        <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">${LOCATION}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#6b7280;">Please make note of this updated address for your upcoming sessions. If you have any questions, reply to this email.</p>
    `),
  },

  {
    id: 'address-change-resolution-approved',
    group: 'Admin alerts',
    label: 'Address change approved (to parent)',
    subject: 'Your address has been updated',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Your address has been updated</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${P_FIRST}, your session address has been updated to <strong>${LOCATION}</strong>. Your tutor has been notified.</p>
      <div style="background:#f9f8f6;border-left:3px solid #E26F6F;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">This applies to all upcoming in-person sessions.</p>
      </div>
      <a href="${SITE}/parent/account" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my account</a>
    `),
  },

  {
    id: 'address-change-resolution-declined',
    group: 'Admin alerts',
    label: 'Address change not actioned (to parent)',
    subject: 'Address update request — not actioned',
    recipient: `${P_NAME} <${P_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Address update request — not actioned</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Hi ${P_FIRST}, we weren't able to update your session address at this time. Please get in touch if you'd like to discuss further.</p>
      <a href="${SITE}/parent/account" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View my account</a>
    `),
  },

  {
    id: 'avail-conflict-admin',
    group: 'Admin alerts',
    label: 'Availability conflict (admin)',
    subject: `Availability conflict — ${T_NAME} removed a slot with upcoming sessions`,
    recipient: 'tara@pocketnote.com.au, tim@pocketnote.com.au',
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Availability conflict</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;"><strong>${T_NAME}</strong> removed the availability slot <strong>Thursday 4:00 PM – 6:00 PM</strong>, which overlaps with the following upcoming sessions:</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
        <tr>
          <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Student</th>
          <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Session time</th>
        </tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${S_NAME}</td><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${SESSION_DT}</td></tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#374151;">Liam Nguyen</td><td style="padding:8px 16px;font-size:13px;color:#374151;">Thursday, 21 Aug 2026 at 4:00 PM</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Please follow up with ${T_NAME} (${T_EMAIL}) to confirm these sessions are still going ahead.</p>
      <div style="margin-top:24px;text-align:center;">
        <a href="${SITE}/admin/tutors" style="display:inline-block;background-color:#E26F6F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">View tutor</a>
      </div>
    `),
  },

  {
    id: 'avail-conflict-tutor',
    group: 'Admin alerts',
    label: 'Availability conflict (to tutor)',
    subject: `Heads up — your availability change affects upcoming sessions`,
    recipient: `${T_NAME} <${T_EMAIL}>`,
    html: admin(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Availability change notice</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${T_NAME}, you removed the availability slot <strong>Thursday 4:00 PM – 6:00 PM</strong>. We noticed this overlaps with the following upcoming sessions:</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f8f6;border-radius:10px;">
        <tr>
          <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Student</th>
          <th style="padding:8px 16px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #f0eeeb;">Session time</th>
        </tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${S_NAME}</td><td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f0eeeb;">${SESSION_DT}</td></tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#374151;">Liam Nguyen</td><td style="padding:8px 16px;font-size:13px;color:#374151;">Thursday, 21 Aug 2026 at 4:00 PM</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">These sessions are still scheduled. Please contact Pocketnote if you have any concerns about your upcoming commitments.</p>
    `),
  },

  // ── Enquiries ─────────────────────────────────────────────────────────────
  {
    id: 'enquiry',
    group: 'Enquiries',
    label: 'New enquiry (admin)',
    subject: `New enquiry — ${S_NAME} (Year 10)`,
    recipient: 'tara@pocketnote.com.au, tim@pocketnote.com.au',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:32px 16px;">
  <h2 style="font-size:18px;color:#111827;margin:0 0 16px;">New Enquiry</h2>
  <table cellpadding="6" style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Parent</strong></td><td>${P_NAME}</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Email</strong></td><td>${P_EMAIL}</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Phone</strong></td><td>0412 345 678</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Student</strong></td><td>${S_NAME}</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Year level</strong></td><td>Year 10</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Subjects</strong></td><td>Maths, Physics</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Location</strong></td><td>Bondi NSW</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Mode</strong></td><td>In-person preferred</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Preferred days</strong></td><td>Tuesday, Thursday</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;padding-bottom:4px;"><strong>Preferred times</strong></td><td>After school (3pm+)</td></tr>
    <tr><td style="color:#6b7280;padding-right:24px;"><strong>How heard</strong></td><td>Google search</td></tr>
  </table>
</body>
</html>`,
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────
export default function EmailPreviewPage() {
  return <EmailPreviewClient emails={EMAILS} />
}
