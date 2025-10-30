const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export interface ApiOptions extends RequestInit {}

export async function apiFetch(path: string, options?: ApiOptions) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options && (options as any).headers),
    },
  });

  return res;
}

export const API_BASE_URL = API_BASE;

export default apiFetch;
