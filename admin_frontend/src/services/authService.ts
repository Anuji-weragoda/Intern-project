import apiFetch, { API_BASE_URL } from "../api/index";

export type User = {
  username?: string;
  displayName?: string;
  email?: string;
  [k: string]: any;
};

export async function getSession(): Promise<User | null> {
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
            data.username || data.displayName || data.name || data.email || data.sub
          );
          if (!hasIdentity) return null;

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
