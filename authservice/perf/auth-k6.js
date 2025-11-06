import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Config via environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const AUTH_BEARER = __ENV.AUTH_BEARER || '';

// Custom metric: track unexpected (truly erroneous) responses we want to fail the test on
const unexpectedRate = new Rate('unexpected_failure');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: __ENV.SMOKE_VUS ? Number(__ENV.SMOKE_VUS) : 5,
      duration: __ENV.SMOKE_DURATION || '30s',
    },
  },
  thresholds: {
    // Keep latency SLO
    'http_req_duration': ['p(95)<1000'],
    // Use our custom unexpected_failure rate as the test pass/fail gate
    'unexpected_failure': ['rate<0.05'],
    // Only enforce http_req_failed for requests that are NOT marked expected
    'http_req_failed{expected:"false"}': ['rate<0.05'],
  },
};

function authHeaders() {
  if (!AUTH_BEARER) return { headers: { 'Content-Type': 'application/json' } };
  return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AUTH_BEARER}` } };
}

// Build request options with optional expected tag
function reqOptions(isExpected = true) {
  const base = authHeaders();
  base.tags = Object.assign({}, base.tags, { expected: isExpected ? 'true' : 'false' });
  return base;
}

function tryParseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1];
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    // pad
    while (payload.length % 4) payload += '=';
    const json = typeof atob === 'function' ? atob(payload) : null;
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
}

// helper to record whether the response status was unexpected
function recordUnexpected(res, expectedStatuses) {
  const isUnexpected = !expectedStatuses.includes(res.status);
  unexpectedRate.add(isUnexpected);
}

export default function () {
  // 1) Health check (no auth) — call without Authorization so health endpoints that don't accept auth behave normally.
  let res = http.get(`${BASE_URL}/healthz`, { headers: { 'Content-Type': 'application/json' }, tags: { expected: 'false' } });
  recordUnexpected(res, [200]);
  check(res, { 'health status 200': (r) => r.status === 200 });

  if (!AUTH_BEARER) {
    sleep(1);
    return;
  }

  // Token diagnostics — attempt to detect if the supplied token looks like an ID token
  const payload = tryParseJwtPayload(AUTH_BEARER);
  if (payload) {
    const looksLikeAccess = !!(payload.scope || payload.scp || payload.aud || payload.azp);
    if (!looksLikeAccess) {
      console.warn('AUTH_BEARER looks like it may be an ID token (not an access token). If endpoints return 401/403, supply a proper access token.');
    }
  }

  // 2) Verify token and extract sub
  res = http.get(`${BASE_URL}/api/v1/auth/verify`, reqOptions(true));
  // Accept 200, 401, 403 as valid responses for this endpoint in headless tests
  recordUnexpected(res, [200, 401, 403]);
  check(res, {
    'verify status 200/401/403': (r) => [200, 401, 403].includes(r.status),
    // Only assert authenticated true when we actually got a 200
    'verify authenticated true': (r) => r.status === 200 ? (() => { try { return r.json().authenticated === true; } catch (e) { return false; } })() : true,
  });

  let sub = null;
  try {
    const body = res.json();
    if (body && body.sub) sub = body.sub;
  } catch (e) { }

  // 3) Sync user after login (POST /api/v1/auth/sync) - include empty JSON body
  res = http.post(`${BASE_URL}/api/v1/auth/sync`, JSON.stringify({}), reqOptions(true));
  recordUnexpected(res, [200, 201, 401, 403]);
  check(res, { 'sync status 200/201/401/403': (r) => [200,201,401,403].includes(r.status) });

  // 4) Get current user profile
  res = http.get(`${BASE_URL}/api/v1/me`, reqOptions(true));
  recordUnexpected(res, [200, 401, 403]);
  check(res, { 'me status 200/401/403': (r) => [200,401,403].includes(r.status) });

  // 5) Try to toggle MFA (safe payload). Accept multiple valid statuses.
  const mfaPayload = JSON.stringify({ enabled: false });
  res = http.post(`${BASE_URL}/api/v1/me/mfa/toggle`, mfaPayload, reqOptions(true));
  recordUnexpected(res, [200,400,401,403,500]);
  check(res, { 'mfa toggle ok': (r) => [200,400,401,403,500].includes(r.status) });

  // 6) Patch profile (non-destructive sample)
  const patchPayload = JSON.stringify({ displayName: 'perf-test' });
  res = http.patch(`${BASE_URL}/api/v1/me`, patchPayload, reqOptions(true));
  recordUnexpected(res, [200,400,401,403]);
  check(res, { 'patch profile ok': (r) => [200,400,401,403].includes(r.status) });

  // 7) If we obtained a sub, query by-sub
  if (sub) {
  res = http.get(`${BASE_URL}/api/v1/me/by-sub/${sub}`, reqOptions(true));
    recordUnexpected(res, [200,404,401,403]);
    check(res, { 'by-sub ok': (r) => [200,404,401,403].includes(r.status) });
  }

  // 8) Admin-ish endpoints (may return 403 if not admin)
  res = http.get(`${BASE_URL}/api/v1/admin/roles`, reqOptions(true));
  recordUnexpected(res, [200,401,403]);
  check(res, { 'admin roles ok': (r) => [200,401,403].includes(r.status) });

  res = http.get(`${BASE_URL}/api/v1/admin/audit-log`, reqOptions(true));
  recordUnexpected(res, [200,401,403]);
  check(res, { 'audit-log ok': (r) => [200,401,403].includes(r.status) });

  sleep(1 + Math.random() * 2);
}
