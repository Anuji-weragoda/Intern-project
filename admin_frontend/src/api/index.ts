// Be defensive for non-Vite environments (e.g., Jest) where import.meta may be undefined
const viteEnvBase = (() => {
  try {
    return (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  } catch {
    return undefined;
  }
})();

const API_BASE =
  viteEnvBase ||
  // Fallback to Node/process env in tests/CI without relying on Node types
  ((globalThis as any)?.process?.env?.VITE_API_BASE_URL as string | undefined) ||
  // Default local backend
  "http://localhost:8081";

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
