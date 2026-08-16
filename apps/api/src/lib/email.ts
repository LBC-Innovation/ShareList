function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

export interface ShareInviteEmail {
  to: string
  inviterEmail: string
  sharelistName: string
  acceptUrl: string
}

function brandedHtml(opts: ShareInviteEmail): string {
  const { inviterEmail, sharelistName, acceptUrl } = opts
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShareList invite</title>
</head>
<body style="margin:0;padding:0;background:#111314;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111314;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#1C1F21;border:1px solid #2A2D30;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 16px;background:linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(74,222,128,0.12) 100%);">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;color:#94A3B8;text-transform:uppercase;">ShareList</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#F1F5F9;font-weight:700;">Someone wants to share a list with you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#F1F5F9;">
                <strong style="color:#38BDF8;">${escapeHtml(inviterEmail)}</strong>
                wants to share
                <strong style="color:#4ADE80;">${escapeHtml(sharelistName)}</strong>
                with you on ShareList.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;">
                Accepting lets you open the list, link your own playlist, and manage it together.
              </p>
              <a href="${escapeAttr(acceptUrl)}"
                 style="display:inline-block;background:linear-gradient(135deg,#38BDF8 0%,#4ADE80 100%);color:#111314;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:12px;">
                Accept
              </a>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748B;">
                If you want to reject this invite, you can simply ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <p style="margin:0;font-size:12px;color:#64748B;">This invite is intended for ${escapeHtml(opts.to)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

export async function sendShareInviteEmail(opts: ShareInviteEmail): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['EMAIL_FROM'] ?? 'ShareList <onboarding@resend.dev>'

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to this worktree .env and restart the API.')
  }

  log('info', 'Sending invite email', { from, to: opts.to })

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to this worktree .env and restart the API.')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: `${opts.inviterEmail} shared “${opts.sharelistName}” with you on ShareList`,
      html: brandedHtml(opts),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to send invite email (${res.status}): ${body}`)
  }

  log('info', 'Invite email sent via Resend', { to: opts.to })
}
