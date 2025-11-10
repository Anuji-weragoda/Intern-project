/**
 * Perform navigation using History API and emit a popstate event.
 * Exported for targeted unit testing without relying on jsdom navigation.
 */
export function navigateWithHistory(href: string) {
  try {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch (_e) {
    // In jsdom, absolute URLs with a different origin can throw.
    // Fall back to a same-origin relative path to avoid DOMException.
    try {
      const url = new URL(href, window.location.href);
      const relative = `${url.pathname}${url.search}${url.hash}`;
      window.history.pushState({}, "", relative);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      // no-op final fallback for non-browser environments
    }
  }
}

export function performRealNavigation(href: string) {
  // Wrapper for real navigation to make it easy to spy/mock in tests
  window.location.assign(href);
}

export function redirect(
  href: string,
  options?: {
    /**
     * Force treating the environment as non-test. Useful for unit tests that want
     * to exercise the real navigation branch (window.location.href) deterministically.
     */
    forceNonTest?: boolean;
    /**
     * Optional injection for performing navigation, primarily for unit testing.
     * If provided, this will be used instead of performRealNavigation.
     */
    perform?: (href: string) => void;
  }
) {
  // Localhost-only E2E bypass: suppress real redirects when test flag is present
  try {
    const host = window.location?.hostname || '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const bypass = typeof localStorage !== 'undefined' ? localStorage.getItem('E2E_BYPASS_AUTH') : null;
    if (isLocal && bypass === '1') {
      return; // do nothing in E2E
    }
  } catch {}

  // Prefer a deterministic, non-throwing path in tests
  // Avoid direct reference to Node's global `process` to keep browser builds type-safe
  const proc = (globalThis as any)?.process;
  const isTestEnv = !!(proc?.env && (proc.env.JEST_WORKER_ID || proc.env.NODE_ENV === "test"));
  const treatAsTest = options?.forceNonTest ? false : isTestEnv;
  if (treatAsTest) {
    navigateWithHistory(href);
    return;
  }

  // In non-test environments, attempt a real navigation first
  try {
    const doNav = options?.perform ?? performRealNavigation;
    doNav(href);
  } catch (err) {
    // Fall back to History API if direct navigation throws (e.g., non-browser env)
    try {
      navigateWithHistory(href);
    } catch {
      // no-op: as a last resort, swallow in tests/non-browser envs
    }
  }
}

export default { redirect, navigateWithHistory, performRealNavigation };
