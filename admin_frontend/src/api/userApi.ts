// Lightweight user API helpers for the frontend
// Exposes a method to fetch a user's profile from the auth service by subject (sub)

async function resolveToken(): Promise<string | null> {
  try {
    const keys = ['jwt_token', 'id_token', 'access_token', 'token'];
    for (const k of keys) {
      try { const v = localStorage.getItem(k); if (v && v.length > 20) return v; } catch (e) {}
      try { const v2 = sessionStorage.getItem(k); if (v2 && v2.length > 20) return v2; } catch (e) {}
    }
    // cookies
    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (const c of cookies) {
        const [name, ...rest] = c.trim().split('=');
        const value = rest.join('=');
        if (['jwt_token','id_token','access_token','token'].includes(name) && value) return decodeURIComponent(value);
      }
    } catch (e) {}
  } catch (e) {}
  return null;
}

const userCache: Record<string, any> = {};

export async function getUserBySub(sub: string) {
  if (!sub) return null;
  if (userCache[sub]) return userCache[sub];
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL || (window as any).__VITE_API_BASE_URL || '';
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/api/v1/me/by-sub/${encodeURIComponent(sub)}`;
  try {
    const token = await resolveToken();
    const headers: Record<string,string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    userCache[sub] = data;
    return data;
  } catch (e) {
    return null;
  }
}

export default { getUserBySub };

export async function getUsers() {
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL || (window as any).__VITE_API_BASE_URL || '';
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/api/v1/users`;
  try {
    const token = await resolveToken();
    const headers: Record<string,string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    // Expecting array or { users: [...] }
    return Array.isArray(data) ? data : (data.users || null);
  } catch (e) {
    return null;
  }
}
