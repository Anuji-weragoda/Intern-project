import apiFetch, { API_BASE_URL } from "../api/index";

export type User = {
  username?: string;
  displayName?: string;
  email?: string;
  [k: string]: any;
};

export async function getSession(): Promise<User | null> {
  // E2E bypass: when running locally with a test flag, short-circuit to a mock user
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const bypass = localStorage.getItem('E2E_BYPASS_AUTH');
      const host = window.location?.hostname || '';
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      if (bypass === '1' && isLocal) {
        const raw = localStorage.getItem('E2E_USER');
        const mock: User = raw ? JSON.parse(raw) : { username: 'e2e', displayName: 'E2E User', email: 'e2e@example.com', roles: ['ADMIN'] } as any;
        return mock;
      }
    }
  } catch {
    // ignore and continue with real flow
  }

  // Try common session endpoints used in this repo
  const candidates = ["/api/v1/me/session", "/api/v1/me", "/api/v1/me/session/"];
  for (const path of candidates) {
    try {
      const res = await apiFetch(path, { method: "GET" });
      if (res.ok) {
        try {
          const data = await res.json();
          // If backend returns an object with an 'error' field or missing identity fields,
          // treat as unauthenticated
          if (!data || data.error) {
            return null;
          }
          // Heuristics: valid session should have at least one of these identifiers
          const hasIdentity = Boolean(
            data.username || data.displayName || data.name || data.email || data.sub || data.cognitoSub
          );
          if (!hasIdentity) return null;

          // If server returned only a cognito sub (or name that's actually a sub), fetch full profile from DB
          const sub = data.sub || data.cognitoSub || data.name;
          if ((!data.displayName || !data.email) && sub) {
            try {
              const profileRes = await apiFetch(`/api/v1/me/by-sub/${encodeURIComponent(sub)}`, { method: "GET" });
              if (profileRes.ok) {
                const profile = await profileRes.json();
                return profile as User;
              }
            } catch (e) {
              // fallback to original data
            }
          }

          return data as User;
        } catch {
          return null;
        }
      }
    } catch (e) {
      // continue to next candidate
    }
  }

  return null;
}

export async function logout(): Promise<void> {
  // Best-effort: clear the non-HttpOnly cookie set by backend success handler
  try {
    document.cookie = "jwt_token=; Max-Age=0; path=/";
  } catch {}

  // Navigate the browser to Spring Security's /logout (CognitoLogoutHandler handles IdP logout)
  // Use a real form POST to ensure the expected HTTP method regardless of server config
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${API_BASE_URL}/logout`;
  document.body.appendChild(form);
  form.submit();
}

export default {
  getSession,
  logout,
};
