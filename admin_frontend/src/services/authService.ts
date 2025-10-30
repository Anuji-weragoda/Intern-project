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
  // Try a programmatic logout first
  try {
    const res = await apiFetch("/logout", { method: "POST" });
    if (res.ok) {
      // Backend may redirect or clear cookie. After logout, navigate to home.
      window.location.href = "/";
      return;
    }
  } catch (e) {
    // fallback
  }

  // Fallback: submit a form to trigger the backend logout flow (older patterns)
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
