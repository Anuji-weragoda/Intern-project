// Diagnostic script: post a create-leave and clock-in to local server using an unsigned JWT
// Run with: node scripts/diag-post.js

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const sampleUserId = '00000000-0000-4000-8000-000000000001';

function base64UrlEncode(obj) {
  const s = JSON.stringify(obj);
  return Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function unsignedJwt(payload) {
  const header = { alg: 'none', typ: 'JWT' };
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.`;
}

async function postJson(path, body, token) {
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log('\nPOST', path, '=>', res.status, res.statusText);
  console.log('Response body:\n', text);
  try { console.log('Parsed JSON:', JSON.parse(text)); } catch (e) {}
  return { status: res.status, body: text };
}

async function run() {
  const token = unsignedJwt({ sub: sampleUserId, iat: Math.floor(Date.now()/1000) });
  console.log('Using unsigned token:', token.slice(0,60) + '...');

  // Create leave
  const leavePayload = {
    user_id: sampleUserId,
    policy_id: 1,
    start_date: '2025-12-01',
    end_date: '2025-12-03',
    reason: 'diag script request'
  };
  await postJson('/api/leaves', leavePayload, token);

  // Clock in
  const clockInPayload = { user_id: sampleUserId, method: 'mobile', geo: { lat: 6.9271, lon: 79.8612 } };
  await postJson('/api/attendance/clock-in', clockInPayload, token);
}

run().catch(err => { console.error('Error in diag script:', err); process.exit(1); });
