import '@testing-library/jest-dom';

// Ensure BASE URL for tests
if (!(globalThis.process && globalThis.process.env && globalThis.process.env.VITE_API_BASE_URL)) {
  globalThis.process = globalThis.process || {};
  globalThis.process.env = globalThis.process.env || {};
  globalThis.process.env.VITE_API_BASE_URL = 'http://localhost:8081';
}

// Polyfill scrollTo for JSDOM
if (!window.scrollTo) {
  window.scrollTo = () => {};
}

// Polyfill TextEncoder/TextDecoder for libraries that expect them (e.g., react-router)
try {
  if (!(globalThis.TextEncoder && globalThis.TextDecoder)) {
    const { TextEncoder, TextDecoder } = await import('util');
    if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
    if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;
  }
} catch {}
