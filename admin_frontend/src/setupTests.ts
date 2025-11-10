// (Removed jest-dom import for production build; file retained only if tests reinstated)
// import '@testing-library/jest-dom';
// Safe TextEncoder/TextDecoder polyfill guarded by availability
const NodeTextEncoder = (globalThis as any).TextEncoder;
const NodeTextDecoder = (globalThis as any).TextDecoder;

// Set a sane default for BASE URL in tests if not provided
if (!(globalThis as any).process?.env?.VITE_API_BASE_URL) {
  (globalThis as any).process = (globalThis as any).process || {};
  (globalThis as any).process.env = (globalThis as any).process.env || {};
  (globalThis as any).process.env.VITE_API_BASE_URL = 'http://localhost:8081';
}

// JSDOM doesn't implement scrollTo; silence calls in components
(window as any).scrollTo = (window as any).scrollTo || (() => {});

// Polyfill TextEncoder/TextDecoder for libraries (react-router, etc.) when missing (ESM-safe)
// In production we assume browser provides these; keep guards minimal (no util dependency)
if (!(globalThis as any).TextEncoder && NodeTextEncoder) (globalThis as any).TextEncoder = NodeTextEncoder;
if (!(globalThis as any).TextDecoder && NodeTextDecoder) (globalThis as any).TextDecoder = NodeTextDecoder;
