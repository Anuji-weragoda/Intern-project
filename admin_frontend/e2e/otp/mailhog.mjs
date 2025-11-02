// Minimal MailHog client to fetch OTP from test inbox
// Requires MAILHOG_URL (e.g., http://localhost:8025) and allows filtering by recipient/subject

import { setTimeout as delay } from 'node:timers/promises';

export async function waitForOtpEmail({
  mailhogUrl,
  to,
  subjectRegex = /otp|verification|code/i,
  codeRegex = /(\d{6})/,
  timeoutMs = 60000,
  pollMs = 1500,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const url = new URL('/api/v2/messages', mailhogUrl).toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`mailhog HTTP ${res.status}`);
      const data = await res.json();
      // data.items is an array of messages; search newest-first
      const items = (data?.items || []).slice().reverse();
      for (const msg of items) {
        const toList = (msg?.To || []).map((t) => t?.Mailbox && t?.Domain ? `${t.Mailbox}@${t.Domain}` : '').filter(Boolean);
        const subj = msg?.Content?.Headers?.Subject?.[0] || '';
        if (to && !toList.some((addr) => addr.toLowerCase() === String(to).toLowerCase())) continue;
        if (!subjectRegex.test(subj)) continue;
        const body = (msg?.Content?.Body) || '';
        const m = body.match(codeRegex);
        if (m && m[1]) {
          return { code: m[1], subject: subj, to: toList, body };
        }
      }
    } catch (e) {
      // ignore and keep polling
    }
    await delay(pollMs);
  }
  throw new Error(`OTP email not found within ${timeoutMs}ms (to=${to || 'any'}, subject~=${subjectRegex})`);
}
