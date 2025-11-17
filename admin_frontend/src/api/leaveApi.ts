// Centralized Leave API client moved to `src/api`.
// leaveApi intentionally does not fall back to the primary API base; prefer a dedicated leave URL.

// Compute the leave API base with multiple fallbacks and a visible debug message.
function getLeaveBase(): string {
  // 1) Vite-provided env at build/dev time
  let viteEnv: string | undefined = undefined;
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      viteEnv = ((import.meta as any).env as any).VITE_LEAVE_API_BASE_URL as string | undefined;
    }
  } catch (e) {
    viteEnv = undefined;
  }
  // 2) process env (tests/CI)
  const procEnv = ((globalThis as any)?.process?.env?.VITE_LEAVE_API_BASE_URL as string | undefined) || undefined;
  // 3) optional global injected value (e.g., window.__VITE_LEAVE_API_BASE_URL) for runtime overrides
  const globalOverride = ((globalThis as any)?.__VITE_LEAVE_API_BASE_URL as string | undefined) || undefined;

  // Do NOT fall back to the generic API base here — leave API should be explicitly configured.
  const resolved = viteEnv || procEnv || globalOverride || "";

  // Debug: show how the leave base resolved (viteEnv preferred)
  try {
    // eslint-disable-next-line no-console
    console.warn("[leaveApi] resolved LEAVE_BASE:", resolved, { viteEnv, procEnv, globalOverride });
  } catch (e) {
    // ignore
  }

  return resolved;
}

export type ApiOptions = RequestInit;

// Lightweight token resolver used by pages elsewhere in the app.
let _cachedToken: string | null = null;
function resolveToken(): string | null {
  if (_cachedToken && _cachedToken.length > 20) return _cachedToken;

  // 1. URL (rare, used after OAuth redirect)
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('jwt') || params.get('token');
    if (fromUrl && fromUrl.length > 20) {
      _cachedToken = fromUrl;
      // remove token from URL for cleanliness
      try { window.history.replaceState({}, '', window.location.pathname); } catch (e) { /* ignore */ }
      return _cachedToken;
    }
  } catch (e) {
    // ignore in non-browser contexts
  }

  // 2. localStorage/sessionStorage
  const keys = ['jwt_token', 'id_token', 'access_token', 'token'];
  try {
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && v.length > 20) { _cachedToken = v; return _cachedToken; }
    }
  } catch (e) { /* localStorage may be inaccessible */ }
  try {
    for (const k of keys) {
      const v = sessionStorage.getItem(k);
      if (v && v.length > 20) { _cachedToken = v; return _cachedToken; }
    }
  } catch (e) { /* sessionStorage may be inaccessible */ }

  // 3. cookies
  try {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (let c of cookies) {
      const [name, ...rest] = c.trim().split('=');
      const value = rest.join('=');
      if (keys.includes(name) && value && value.length > 20) {
        _cachedToken = decodeURIComponent(value);
        return _cachedToken;
      }
    }
  } catch (e) { /* ignore */ }

  return null;
}

async function leaveFetch(path: string, options?: ApiOptions) {
  if (!path.startsWith("http")) {
    // Resolve the base lazily at call time so env variables are read when requests are made
    const base = getLeaveBase() || "";
    const url = `${base}${path}`;
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = resolveToken();
    const mergedHeaders = {
      ...defaultHeaders,
      ...(options && (options as any).headers),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;

    // Ensure JSON bodies are stringified consistently here (clients may pass object or string)
    const opts: RequestInit = { ...(options || {}) };
    if (opts.body !== undefined) {
      // If body is an object, stringify it. If it's already a string, try to parse and normalize dates for leave endpoints.
      if (typeof opts.body !== 'string') {
        try {
          // If body is an object, normalize date fields to local YYYY-MM-DD before stringifying
          const obj = (opts as any).body;
          if (obj && (obj.start_date || obj.end_date)) {
            const toLocalDateOnly = (val: any) => {
              if (!val) return val;
              try {
                const dt = new Date(val);
                if (Number.isNaN(dt.getTime())) return val;
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              } catch (e) {
                return val;
              }
            };
            obj.start_date = toLocalDateOnly(obj.start_date);
            obj.end_date = toLocalDateOnly(obj.end_date);
          }
          (opts as any).body = JSON.stringify(obj);
        } catch (e) {
          // leave as-is if stringify fails
        }
      } else {
        // If the body is already a JSON string, attempt to parse and normalize date fields for /api/leaves
        try {
          const maybeObj = JSON.parse((opts as any).body);
          if (maybeObj && (maybeObj.start_date || maybeObj.end_date)) {
            const toLocalDateOnly = (val: any) => {
              if (!val) return val;
              try {
                const dt = new Date(val);
                if (Number.isNaN(dt.getTime())) return val;
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              } catch (e) {
                return val;
              }
            };
            maybeObj.start_date = toLocalDateOnly(maybeObj.start_date);
            maybeObj.end_date = toLocalDateOnly(maybeObj.end_date);
            (opts as any).body = JSON.stringify(maybeObj);
          }
        } catch (e) {
          // not JSON or parse failed — ignore
        }
      }
    }

    // Debug outgoing request (trim long bodies)
    try {
      // eslint-disable-next-line no-console
      console.debug('[leaveApi] request ->', { url, method: opts.method || 'GET', headers: mergedHeaders, bodyPreview: (opts as any).body ? String((opts as any).body).slice(0, 1000) : undefined });
    } catch (e) {}

    const res = await fetch(url, {
      credentials: "include",
      ...opts,
      headers: mergedHeaders,
    });

    if (res.status === 401) {
      try { console.warn('[leaveApi] 401 Unauthorized from', url, 'tokenPresent=', !!token); } catch (e) {}
    }

    if (!res.ok) {
      try {
        const txt = await res.clone().text();
        try { console.error('[leaveApi] non-OK response body:', JSON.parse(txt)); } catch (e) { console.error('[leaveApi] non-OK response text:', txt); }
      } catch (e) {
        // ignore
      }
    }

    return res;
  }
  // absolute URL passed
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = resolveToken();
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options && (options as any).headers),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;

  const opts: RequestInit = { ...(options || {}) };
  if (opts.body !== undefined && typeof opts.body !== 'string') {
    try {
      (opts as any).body = JSON.stringify(opts.body);
    } catch (e) {
      // leave as-is
    }
  }

  try {
    // eslint-disable-next-line no-console
    console.debug('[leaveApi] request (absolute) ->', { url: path, method: opts.method || 'GET', headers: mergedHeaders, bodyPreview: (opts as any).body ? String((opts as any).body).slice(0,1000) : undefined });
  } catch (e) {}

  const res = await fetch(path, {
    credentials: "include",
    ...opts,
    headers: mergedHeaders,
  });

  if (res.status === 401) {
    try { console.warn('[leaveApi] 401 Unauthorized from absolute URL', path, 'tokenPresent=', !!token); } catch (e) {}
  }

  if (!res.ok) {
    try {
      const txt = await res.clone().text();
      try { console.error('[leaveApi] non-OK response body (absolute):', JSON.parse(txt)); } catch (e) { console.error('[leaveApi] non-OK response text (absolute):', txt); }
    } catch (e) {}
  }

  return res;
}

export async function getLeaveBalance(userId: number | string) {
  if (userId === undefined || userId === null || userId === '') {
    return await leaveFetch(`/api/leaves/balance`);
  }
  return await leaveFetch(`/api/leaves/balance?user_id=${encodeURIComponent(String(userId))}`);
}

export async function getLeaveRequests(query: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
  return await leaveFetch(`/api/leaves?${params.toString()}`);
}

export async function createLeaveRequest(body: any) {
  return await leaveFetch(`/api/leaves`, { method: "POST", body: JSON.stringify(body) });
}

export async function patchLeaveRequest(id: number | string, body: any) {
  // Map actions to the server's explicit routes when possible
  const action = body && body.action ? String(body.action).toLowerCase() : undefined;
  if (action === 'approve') {
    return await leaveFetch(`/api/leaves/${id}/approve`, { method: 'PATCH', body: JSON.stringify(body) });
  }
  if (action === 'reject') {
    return await leaveFetch(`/api/leaves/${id}/reject`, { method: 'PATCH', body: JSON.stringify(body) });
  }
  // For other actions (e.g., cancel) the server may expect a generic patch — try the id endpoint
  return await leaveFetch(`/api/leaves/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function getAttendance(query: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
  return await leaveFetch(`/api/attendance?${params.toString()}`);
}

export async function clockIn(body: any) {
  return await leaveFetch(`/api/attendance/clock-in`, { method: "POST", body: JSON.stringify(body) });
}

export async function clockOut(body: any) {
  return await leaveFetch(`/api/attendance/clock-out`, { method: "POST", body: JSON.stringify(body) });
}

export async function syncMsGraph(body: any) {
  return await leaveFetch(`/api/v1/integrations/msgraph/sync`, { method: "POST", body: JSON.stringify(body) });
}

export async function getLeaveSummary(query: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
  return await leaveFetch(`/api/v1/reports/leave-summary?${params.toString()}`);
}

export async function healthz() {
  return await leaveFetch(`/healthz`);
}

export default leaveFetch;
