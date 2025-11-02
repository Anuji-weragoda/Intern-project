import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

// Set a sane default for BASE URL in tests if not provided
if (!(globalThis as any).process?.env?.VITE_API_BASE_URL) {
  (globalThis as any).process = (globalThis as any).process || {};
  (globalThis as any).process.env = (globalThis as any).process.env || {};
  (globalThis as any).process.env.VITE_API_BASE_URL = 'http://localhost:8081';
}

// JSDOM doesn't implement scrollTo; silence calls in components
(window as any).scrollTo = (window as any).scrollTo || (() => {});

// Polyfill TextEncoder/TextDecoder for libraries (react-router, etc.) when missing (ESM-safe)
if (!(globalThis as any).TextEncoder && NodeTextEncoder) {
  (globalThis as any).TextEncoder = NodeTextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (!(globalThis as any).TextDecoder && NodeTextDecoder) {
  (globalThis as any).TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;
}
