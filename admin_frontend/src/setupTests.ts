import '@testing-library/jest-dom';

// Set a sane default for BASE URL in tests if not provided
if (!(globalThis as any).process?.env?.VITE_API_BASE_URL) {
  (globalThis as any).process = (globalThis as any).process || {};
  (globalThis as any).process.env = (globalThis as any).process.env || {};
  (globalThis as any).process.env.VITE_API_BASE_URL = 'http://localhost:8081';
}

// JSDOM doesn't implement scrollTo; silence calls in components
(window as any).scrollTo = (window as any).scrollTo || (() => {});
